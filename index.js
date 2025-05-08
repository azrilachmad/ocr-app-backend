require('dotenv').config()
const PORT = process.env.PORT || 3001;

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./config/db.js');
const catchAsync = require('./utils/catchAsync.js');
const AppError = require('./utils/appError.js');
const app = express();
const globalErrorHandler = require('./controllers/errorController.js')
const cron = require('node-cron');
const jobSchedule = require('./db/sqModels/jobSchedule.js')
const scheduleLog = require('./db/sqModels/scheduleLog.js')
const { convDate, msToHHMMSS, setUTC7 } = require('./helper/index.js')
const Cars = require('./model/vehicleModel.js');
const dataParameter = require('./db/sqModels/dataParameter.js');
const { GoogleGenerativeAI, DynamicRetrievalMode } = require('@google/generative-ai');
const dataSource = require('./db/sqModels/dataSource.js');
const { Op, Sequelize } = require('sequelize');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    tools: [{
        google_search_retrieval: {
            dynamic_retrieval_config: {
                mode: "MODE_DYNAMIC",
                dynamic_threshold: 0.42,
            },
        },
    },],
});
async function getDynamicGenerationConfig() {
    const jobScheduleData = await jobSchedule.findAll();
    const parseDataConfig = jobScheduleData.map((item) => item.toJSON());
    const temperature_value = parseDataConfig[0]?.ai_temp;
    // console.log("Temperature Value: " + temperature_value)
    return {
        temperature: temperature_value || 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
    };
}

// Define every route
const vehicleRoute = require('./routes/vehicleRoute.js')
const authRoute = require('./routes/authRoute.js')
const userRoute = require('./routes/userRoute.js')
const dataParameterRoute = require('./routes/dataParameterRoute.js')
const dataSourceRoute = require('./routes/dataSourceRoute.js')
const jobScheduleRoute = require('./routes/jobScheduleRoute.js');
const dashboardRoute = require('./routes/dashboardRoute.js');
const vehicleSales = require('./model/vehicleSales.js');



const corsOptions = {
    origin: ['https://pricecheck.sipector.com', 'https://market-prediction.synchro.co.id', 'http://147.139.171.166:3000', 'http://localhost:3000', '*'], // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true, // Allow cookies/auth headers
};
app.use(cors(corsOptions));

app.use(express.json());

db.authenticate()
    .then(() => console.log('Database Connected...'))
    .catch(err => console.error("Error connecting to the database: ", err))

app.use(vehicleRoute);
app.use(authRoute);
app.use(userRoute);
app.use(dataParameterRoute);
app.use(dataSourceRoute);
app.use(jobScheduleRoute);
app.use(dashboardRoute);



(async () => {
    try {
        let parseData = [];
        let currentCronJob = null;
        dayjs.extend(utc);
        dayjs.extend(timezone);
        // Fetch the schedule data from the database
        async function fetchJobSchedule() {
            const jobScheduleData = await jobSchedule.findAll();
            parseData = jobScheduleData.map((item) => item.toJSON());
            const date = dayjs(parseData[0]?.time).tz('Asia/Bangkok'); // Use a valid timezone name
            const hh = date.hour();
            const mm = date.minute();
            const ss = date.second();
            console.log(hh, mm, ss);
            return {
                hour: hh,
                minute: mm,
                second: ss,
                parseData,
            };
        }

        // Schedule the price check job
        function schedulePriceCheck({ hour, minute, second, parseData }) {
            // Stop the existing job if it exists
            if (currentCronJob) {
                currentCronJob.stop();
                console.log('Previous cron job stopped.');
            }

            // console.log(parseData[0]?.ai_iqr)

            // Create a new cron job
            // const cronTime = `* * * * * *`; // Dynamic schedule
            const cronTime = `${minute} ${hour} * * *`; // Dynamic schedule
            currentCronJob = cron.schedule(cronTime, async () => {
                console.log('Price check cron job running...');

                try {
                    const startTime = Date.now();

                    // --- Begin price-check logic ---
                    const rawData = await Cars.findAndCountAll({
                        limit: parseData[0].max_record,
                        offset: 0,
                        order: [['created_at', 'ASC']],
                        where: {
                            [Op.and]: [
                                {
                                    hit_count: {
                                        [Op.or]: [
                                            { [Op.lt]: 2 },  // hit_count < 2
                                            { [Op.is]: null } // hit_count IS NULL
                                        ]
                                    }
                                },
                                {
                                    [Op.or]: [
                                        { ai_harga_atas: 0 }, // harga_atas = 0
                                        { ai_harga_bawah: 0 }, // harga_bawah = 0
                                        { ai_harga_atas: { [Op.is]: null } }, // harga_atas IS NULL
                                        { ai_harga_bawah: { [Op.is]: null } }, // harga_bawah IS NULL
                                    ],
                                },
                            ],
                        }
                    });

                    let dataSet = rawData.rows.map((item) => item.dataValues);

                    // Dynamic parameters
                    const dataParam = await dataParameter.findAndCountAll({ where: { status: true } });
                    let parameterSet = {};
                    dataParam.rows.map((item) => {
                        parameterSet = { ...parameterSet, [item.dataValues.table_column]: item.dataValues.parameter };
                    });

                    const dataSourceData = await dataSource.findAndCountAll({ where: { status: true } });
                    let sourceSet = dataSourceData.rows.map((item) => item.dataValues.address);

                    let totalToken = 0;


                    if (dataSet.length > 0) {
                        for (const data of dataSet) {

                            // Proses Compare Price Check 
                            const rawCompare = await vehicleSales.findAndCountAll({
                                where: {
                                    nama_mobil: {
                                        [Op.like]: `${data.ai_nama_mobil}%`,
                                    },
                                    year2: {
                                        [Op.like]: `%${data.tahun}%`
                                    },
                                    // provinsi_lokasi_unit: {
                                    //     [Op.like]: `%${data.provinsi}%`
                                    // },
                                    kota: {
                                        [Op.like]: `%${data?.kota?.replace(/^(Kota |Kabupaten )/, '')}%`
                                    },
                                    grade: {
                                        [Op.not]: null,
                                    },
                                },
                                attributes: ["tgl", "nama_mobil", "grade", "selling"],
                                order: [
                                    [
                                        Sequelize.literal(
                                            `CASE 
                                                WHEN grade = 'A'  THEN 1  
                                                WHEN grade = 'A-' THEN 2  
                                                WHEN grade = 'B+' THEN 3  
                                                WHEN grade = 'B'  THEN 4  
                                                WHEN grade = 'B-' THEN 5  
                                                WHEN grade = 'C+' THEN 6  
                                                WHEN grade = 'C'  THEN 7  
                                                WHEN grade = 'C-' THEN 8  
                                                ELSE 9  
                                            END`
                                        ),
                                        "ASC",
                                    ],
                                    [Sequelize.fn("STR_TO_DATE", Sequelize.col("tgl"), "%d/%m/%Y"), "DESC"],
                                ],
                            });

                            let compareSet = rawCompare.rows.map((item) => item.dataValues);
                            // console.log("AI Nama Mobil:" + data.ai_nama_mobil)
                            // console.log("Compare nama mobil: " + compareSet[0]?.nama_mobil);
                            // console.log("Selling: " + compareSet[0].selling);


                            // Proses mapping list data parameter
                            const parameterString = Object.entries(parameterSet)
                                .map(([key, value]) => `${value}: ${data[key]}`)
                                .join(", ");

                            //  Proses mapping data source
                            const referenceLinks = sourceSet.map((link) => `- ${link}`).join(", ");

                            // Define Prompt
                            const prompt = `Tentukan harga terendah dan tertinggi kendaraan bekas untuk ${parameterString} dengan ketentuan sebagai berikut:\n
                            1. Data yang digunakan\n
                            - Sumber utama: Data terbaru dari ${sourceSet.length > 0 ? referenceLinks : '-'} (periksa listing hari ini).\n
                            - Parameter pencarian: ${parameterString}\n
                            - Transmisi diabaikan (termasuk semua tipe transmisi).\n

                            2. Proses Analisa: \n
                            - Hitung 'Interquartile Range (IQR)':\n
                            - Pengali IQR yang digunakan adalah ${parseData[0]?.ai_iqr ? parseData[0]?.ai_iqr : 1.5}.\n
                            - Hapus outlier (data di luar batas bawah/atas atau harga tidak wajar)\n
                            - Dari data yang telah dibersihkan, tentukan harga terendah (minimum) dan harga tertinggi (maksimum).
                            
                            3. Output:\n
                            - Tidak perlu ada penjelasan, hanya tampilkan json saja\n
                            - Format JSON: {"harga_terendah": harga_terendah, "harga_tertinggi": harga_tertinggi} (tanpa penjelasan tambahan).\n
                            - Tidak perlu ada "'''json'''"

                            4. Tambahan:\n
                            - Harga kendaraan hanya boleh didapatkan berdasarkan iklan yang tertera sesuai link referensi\n
                            - Tidak boleh mengambil harga dari sumber selain iklan seperti artikel, berita, atau bulletin, pada link referensi \n
                            `;

                            const generationConfig = await getDynamicGenerationConfig();

                            const chatSession = model.startChat({
                                generationConfig,
                                history: [],
                            });

                            // const result = await model.generateContent(prompt);
                            const result = await chatSession.sendMessage(prompt);
                            totalToken += result.response.usageMetadata.totalTokenCount * 1;
                            // totalToken += 0;

                            let comparePrice = 0;
                            let compareDate = null;


                            if (compareSet.length > 0) { comparePrice = compareSet[0].selling }
                            if (compareSet.length > 0) { compareDate = compareSet[0].tgl }


                            let jsonString = result.response.text().replace(/```json|```/g, "").trim();
                            const resultData = JSON.parse(jsonString)

                            await Cars.update(
                                {
                                    harga_history_date: compareDate,
                                    ai_harga_history: !isNaN(comparePrice) ? comparePrice : parseInt(comparePrice.replace(/\./g, "").trim(), 10),
                                    ai_harga_atas: resultData.harga_terendah,
                                    ai_harga_bawah: resultData.harga_tertinggi,
                                    hit_count: Sequelize.literal("CASE WHEN hit_count IS NULL THEN 1 ELSE hit_count + 1 END"),
                                    updated_at: dayjs.tz(Date.now(), "Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
                                    checked_date: dayjs.tz(Date.now(), "Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")
                                },
                                { where: { id: data.id } }
                            );
                        }
                        const endTime = Date.now();
                        const executionTimeInMs = endTime - startTime;
                        const executionTime = msToHHMMSS(executionTimeInMs);
                        const timeSplit = executionTime.split(':');
                        const seconds = (+timeSplit[0]) * 60 * 60 + (+timeSplit[1]) * 60 + (+timeSplit[2]);

                        await scheduleLog.sync({ alter: true });
                        await scheduleLog.create({
                            type: 'Scheduled',
                            date: setUTC7(parseData[0]?.time),
                            total_data: dataSet.length,
                            total_token: totalToken,
                            average_token: totalToken / dataSet.length,
                            duration: seconds,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    } else {
                        console.log('No data to be processed')
                    }

                } catch (error) {
                    console.error('Error in price check job:', error);
                }
            }, {
                timezone: 'Asia/Jakarta',
            });

            console.log(`New cron job scheduled at: ${cronTime}`);
        }

        // Initial schedule setup
        const scheduleData = await fetchJobSchedule();
        schedulePriceCheck(scheduleData);

        // Periodically check for schedule updates (every minute)
        setInterval(async () => {
            const updatedScheduleData = await fetchJobSchedule();

            const hasScheduleChanged =
                updatedScheduleData.hour !== scheduleData.hour ||
                updatedScheduleData.minute !== scheduleData.minute ||
                updatedScheduleData.second !== scheduleData.second;

            if (hasScheduleChanged) {
                console.log('Schedule updated in database, rescheduling the cron job...');
                schedulePriceCheck(updatedScheduleData);
            }
        }, 20000); // Check every 60 seconds

    } catch (error) {
        console.error("Error occurred:", error);
    }
})();

app.use('*', catchAsync(async (req, res, next) => {
    throw new AppError(`Can't find ${req.originalUrl} on this server`, 404)
}))

app.use(globalErrorHandler);


app.listen(PORT, () => console.log(`listening on port: http://localhost:${PORT}`));
