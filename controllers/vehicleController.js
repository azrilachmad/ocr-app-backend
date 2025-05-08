require('dotenv').config()
const { GoogleGenerativeAI, DynamicRetrievalMode } = require("@google/generative-ai");
const Vehicle = require("../model/vehicleModel.js");
const { DataTypes, Op, Sequelize } = require("sequelize");
const Cars = require("../model/vehicleModel.js");
const CarsType = require("../model/vehicleType.js");
const sequelize = require("../config/db.js");
const { convDate, setUTC7 } = require("../helper/index.js");
const catchAsync = require('../utils/catchAsync.js');
const { link } = require('fs');
const dataSource = require('../db/sqModels/dataSource.js');
const scheduleLog = require('../db/sqModels/scheduleLog.js');
const vehicleSales = require('../model/vehicleSales.js');
const dayjs = require('dayjs');
const jobSchedule = require('../db/sqModels/jobSchedule.js');

const fs = ('fs');
const { ChartJSNodeCanvas } = ("chartjs-node-canvas");

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
    console.log("Temperature Value: " + temperature_value)
    return {
        temperature: temperature_value || 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
    };
}


const createSinglePredict = catchAsync(async (req, res) => {

    const {
        jenis_kendaraan,
        nama_kendaraan,
        tahun_kendaraan,
        jarak_tempuh_kendaraan,
        transmisi_kendaraan,
        bahan_bakar,
        wilayah_kendaraan,
    } = req.body


    try {

        const dataSourceData = await dataSource.findAndCountAll({ where: { status: true } });
        let sourceSet = dataSourceData.rows.map((item) => item.dataValues.address);
        const referenceLinks = sourceSet.map((link) => `- ${link}`).join(", ");
        const jobScheduleData = await jobSchedule.findAll();
        const parseData = jobScheduleData.map((item) => item.toJSON());
        const ai_iqr = parseData[0]?.ai_iqr;


        let totalToken = 0;
        console.log("IQR Value: " + ai_iqr)


        const prompt = `Tentukan harga terendah dan tertinggi sebuah Kendaraan untuk ${jenis_kendaraan} ${nama_kendaraan}, Tahun ${tahun_kendaraan}, transmisi kendaraan ${transmisi_kendaraan}, bahan bakar ${bahan_bakar} di wilayah ${wilayah_kendaraan} dengan ketentuan sebagai berikut:\n
        1. Data yang digunakan\n
        - Sumber utama: Data terbaru dari ${sourceSet.length > 0 ? referenceLinks : '-'} (periksa listing hari ini).\n
        - Parameter pencarian: Model "${nama_kendaraan}", Tahun "${tahun_kendaraan}", Bahan Bakar "${bahan_bakar}", Wilayah "${wilayah_kendaraan}" \n
        - Transmisi diabaikan (termasuk semua tipe transmisi).\n

        2. Proses Analisa: \n
        - Hitung 'Interquartile Range (IQR)':\n
        - Pengali IQR yang digunakan adalah ${ai_iqr ? ai_iqr : 1.5}.\n
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


        const rawCompare = await vehicleSales.findAndCountAll({
            where: {
                nama_mobil: {
                    [Op.like]: `%${nama_kendaraan}%`
                },
                year2: {
                    [Op.like]: `%${tahun_kendaraan}%`
                },
                kota: {
                    [Op.like]: `%${wilayah_kendaraan}%`
                },
                // provinsi_lokasi_unit: {
                //     [Op.like]: `%${match ? match[2].trim() : ''}%`
                // },
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

        let comparePrice = 0;
        let compareDate = null;

        if (compareSet.length > 0) { comparePrice = compareSet[0].selling }
        if (compareSet.length > 0) { compareDate = compareSet[0].tgl }


        let jsonString = result.response.text().replace(/```json|```/g, "").trim();
        const resultData = JSON.parse(jsonString)
        console.log(comparePrice)
        console.log(resultData)
        const responseData = {
            data: {
                nama_kendaraan: nama_kendaraan,
                tahun_kendaraan: tahun_kendaraan,
                wilayah_kendaraan: wilayah_kendaraan,
                harga_terendah: resultData.harga_terendah,
                harga_tertinggi: resultData.harga_tertinggi,
                harga_history_date: compareDate,
                harga_history: !isNaN(comparePrice) ? comparePrice : parseInt(comparePrice.replace(/\./g, "").trim(), 10),
                link_referensi: sourceSet,
                total_token: totalToken
            },
            error: false,
            status_code: 200,
        }
        res.status(200).send(responseData)
    } catch (error) {
        console.error("Error parsing JSON:", error);
        return res.status(400).send({ message: 'An error occurred!', error: error.message });

    }

})

const createBulkPredict = catchAsync(async (req, res) => {
    const newData = []
    try {
        for (let i = 0; i < req.body.data.length; i++) {
            const vehicleCorrectionPrompt = `Koreksi nama unit ini dengan nama yang benar dan singkat, anda bisa cari di internet. berikan response langsung nama nya tanpa perlu Nama unit yang benar adalah : ${req.body.data[i].desciption}. tidak boleh ada \n ataupun simbol apapun.`;
            const correctionResult = await geminiModel.generateContent(vehicleCorrectionPrompt);
            const vehicleCorrection = correctionResult.response;
            const transmisi = req.body.data[i].transmisi === 'AT' ? 'Automatic' : req.body.data[i].transmisi === 'MT' ? 'Manual' : 'Tidak Diketahui'

            const marketPredictionPrompt = `Berikan Average Market Price untuk mobil Bekas ${vehicleCorrection.text().replace('\n', '')}, jarak tempuh kendaraan ${req.body.data[i].km} km, transmisi kendaraan ${transmisi}, wilayah kendaraan ${req.body.data[i].lokasi}.generate dalam bentuk JSON dengan format sebagai berikut:{"harga_terendah": Harga Terendah, "harga_tertinggi": Harga Tertinggi, "link_sumber_analisa: [link1, link2, link3, link4]}. bbuat tanpa catatan, tidak boleh ada \n tidak boleh juga ada backslash tidak boleh ada tulisan json, hanya hasil sesuai format`
            const predictionResult = await geminiModel.generateContent(marketPredictionPrompt)
            const predictionResponse = predictionResult.response
            const marketPrediction = JSON.parse(predictionResponse.text())
            // console.log(marketPrediction.harga_terendah)
            // console.log(marketPrediction.harga_tertinggi)
            newData.push({
                id: req.body.data[i].id ? req.body.data[i].id : null,
                tanggal_jual: req.body.data[i].tanggal_jual ? req.body.data[i].tanggal_jual : null,
                lokasi: req.body.data[i].lokasi ? req.body.data[i].lokasi : null,
                desciption: vehicleCorrection.text().replace('\n', ''),
                jenismobil: req.body.data[i].jenismobil ? req.body.data[i].jenismobil : null,
                transmisi: req.body.data[i].transmisi ? req.body.data[i].transmisi : null,
                year: req.body.data[i].year ? req.body.data[i].year : null,
                umurmobil: req.body.data[i].umurmobil ? req.body.data[i].umurmobil : null,
                color: req.body.data[i].color ? req.body.data[i].color : null,
                nopol: req.body.data[i].nopol ? req.body.data[i].nopol : null,
                pajak: req.body.data[i].pajak ? req.body.data[i].pajak : null,
                stnk: req.body.data[i].stnk ? req.body.data[i].stnk : null,
                grade_all: req.body.data[i].grade_all ? req.body.data[i].grade_all : null,
                gradeinterior: req.body.data[i].gradeinterior,
                gradebody: req.body.data[i].gradebody,
                grademesin: req.body.data[i].grademesin,
                km: req.body.data[i].km,
                bottom_price: marketPrediction.harga_terendah !== null ? marketPrediction.harga_terendah : req.body.data[i].bottom_price,
                status: req.body.data[i].status,
                harga_terbentuk: req.body.data[i].harga_terbentuk,
                nama_mobil: vehicleCorrection.text().replace('\n', ''),
                harga_atas: marketPrediction.harga_tertinggi,
                harga_bawah: marketPrediction.harga_terendah,
            })
        }

        const responseData = {
            data: newData,
            error: false,
            message: "OK - The request was successfull",
            meta: {
                page: 1,
                perPage: 100,
                total: newData.length,
                totalPages: Math.ceil(newData.length / 10),
            },
            status: 200,
        }
        res.status(200).send(responseData)
    } catch (error) {
        console.log("response error", error);
    }

})


const getVehicleList = catchAsync(async (req, res) => {
    const pageAsNumber = parseInt(req.query.page) || 1;
    const limitAsNumber = parseInt(req.query.limit) || 10;
    const order = req.query.order;
    const sortBy = req.query.sortBy;
    const search = req.query.search;

    let page = 0;
    if (!Number.isNaN(pageAsNumber) && pageAsNumber > 0) {
        page = pageAsNumber;
    }

    let limit = 10;
    if (!Number.isNaN(limitAsNumber) && limitAsNumber > 0) {
        page = limitAsNumber;
    }


    try {
        const vehicles = await Cars.findAndCountAll({
            limit: limitAsNumber, offset: page === 1 ? 0 : (pageAsNumber - 1) * limitAsNumber, order: [[sortBy ? sortBy : 'checked_date', order ? order : 'DESC']],
            where: search && sortBy
                ? {
                    [Op.or]: [
                        { [sortBy]: { [Op.like]: `%${search}%` } },
                    ],
                }
                : search ? {
                    [Op.or]: [
                        { ai_nama_mobil: { [Op.like]: `%${search}%` } },
                        { vehicle_transmission: { [Op.like]: `%${search}%` } },
                        { tahun: { [Op.like]: `%${search}%` } },
                        { kota: { [Op.like]: `%${search}%` } },
                        { provinsi: { [Op.like]: `%${search}%` } },
                        { ai_harga_history: { [Op.like]: `%${search}%` } },
                        { ai_harga_atas: { [Op.like]: `%${search}%` } },
                        { ai_harga_bawah: { [Op.like]: `%${search}%` } },
                    ],
                } : {}, // Empty object if no query 
        })
        res.json({
            data: vehicles.rows,
            error: false,
            message: "OK - The request was successfull",
            meta: {
                page: req.query.page,
                perPage: limit.toString(),
                total: vehicles.count,
                totalPages: Math.ceil(vehicles.count / limit)
            }
            // totalRows: totalRows,
            // totalPage: totalPage
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

const getChart = catchAsync(async (req, res) => {
    const width = 400; //px
    const height = 400; //px
    const backgroundColour = 'white'; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour });

    const { chartType } = req.query

    const configuration = {
        type: chartType,   // for line chart
        data: {
            labels: [2018, 2019, 2020, 2021],
            datasets: [{
                label: "Sample 1",
                data: [10, 15, 20, 15],
                fill: false,
                borderColor: ['rgb(51, 204, 204)'],
                borderWidth: 1,
                xAxisID: 'xAxis1' //define top or bottom axis ,modifies on scale
            },
            {
                label: "Sample 2",
                data: [10, 30, 20, 10],
                fill: false,
                borderColor: ['rgb(255, 102, 255)'],
                borderWidth: 1,
                xAxisID: 'xAxis1'
            },
            ],
        },
        options: {
            scales: {
                y: {
                    suggestedMin: 0,
                }
            }
        }
    }
    const dataUrl = await chartJSNodeCanvas.renderToDataURL(configuration);
    const base64Image = dataUrl
    var base64Data = base64Image.replace(/^data:image\/png;base64,/, "");
    fs.writeFile("out.png", base64Data, 'base64', function (err) {
        if (err) {
            console.log(err);
        }
    });

    try {
        res.json({
            data: dataUrl,
            message: "OK - The request was successfull",
            // totalRows: totalRows,
            // totalPage: totalPage
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

const updateVehicleData = catchAsync(async (req, res) => {
    try {
        const { id, tahun_kendaraan, wilayah_kendaraan, harga_bawah, harga_atas, total_token, desciption, user, type } = req.body;

        const regex = /(?:Kota|Kabupaten)\s([^,]+),\s(?:Provinsi\s)?(.+)/;
        const match = wilayah_kendaraan.match(regex);

        const rawCompare = await vehicleSales.findAndCountAll({
            where: {
                nama_mobil: {
                    [Op.like]: `%${desciption}%`
                },
                year2: {
                    [Op.like]: `%${tahun_kendaraan}%`
                },
                kota: {
                    [Op.like]: `%${match ? match[1] : ''}%`
                },
                // provinsi_lokasi_unit: {
                //     [Op.like]: `%${match ? match[2] : ''}%`
                // },
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

        let comparePrice = 0;
        let compareDate = null;


        if (compareSet.length > 0) { comparePrice = compareSet[0].selling }
        if (compareSet.length > 0) { compareDate = compareSet[0].tgl }


        await Cars.update({
            harga_history_date: compareDate,
            ai_harga_history: !isNaN(comparePrice) ? comparePrice : parseInt(comparePrice.replace(/\./g, "").trim(), 10),
            ai_harga_bawah: harga_bawah,
            ai_harga_atas: harga_atas,
            hit_count: Sequelize.literal("CASE WHEN hit_count IS NULL THEN 1 ELSE hit_count + 1 END"),
            updated_at: dayjs.tz(Date.now(), "Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss"),
            checked_date: Date.now()
        }, { where: { id } });

        await scheduleLog.create({
            type: "Manual",
            date: setUTC7(new Date()),
            total_data: 1,
            total_token: total_token,
            average_token: total_token / 1,
            duration: 2,
            user: user,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        res.json({
            error: false,
            message: "OK - The request was successfull",
            status: 200,
        });
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
})

const getVehicleType = catchAsync(async (req, res) => {

    try {
        const vehicles = await CarsType.findAndCountAll({
            attributes: ['jenismobil', [Sequelize.fn('COUNT', Sequelize.col('jenismobil')), 'value']],
            group: ['jenismobil'],
            order: [[Sequelize.col('value'), 'DESC']], // Order by jumlah_mobil DESC
            limit: 10
        })
        res.json({
            data: vehicles.rows,
            error: false,
            message: "OK - The request was successfull",
            meta: {
                total: vehicles.count,
            }
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

const getCarCount = catchAsync(async (req, res) => {

    try {
        const vehicles = await CarsType.count({})
        res.json({
            data: vehicles,
            error: false,
            message: "OK - The request was successfull",
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

const getCarTypeCount = catchAsync(async (req, res) => {

    try {
        const vehicles = await Cars.count({
            distinct: true,
            col: 'jenismobil'
        })
        res.json({
            data: vehicles,
            error: false,
            message: "OK - The request was successfull",
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

const getOmsetPenjualan = catchAsync(async (req, res) => {

    try {
        const vehicles = await Cars.sum('harga_terbentuk')
        res.json({
            data: vehicles,
            error: false,
            message: "OK - The request was successfull",
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

const getVehicleRank = catchAsync(async (req, res) => {

    try {
        const vehicles = `WITH RankedSales AS (SELECT
                jenismobil,
                TO_CHAR(DATE_TRUNC('month', tanggal_jual), 'Month') AS bulan,
                DATE_TRUNC('month', tanggal_jual) AS tanggal,
                SUM(harga_terbentuk) AS sum_harga_terbentuk,
                ROW_NUMBER() OVER (PARTITION BY TO_CHAR(DATE_TRUNC('month', tanggal_jual), 'Month') ORDER BY SUM(harga_terbentuk) DESC) AS peringkat
            FROM cars
            GROUP BY jenismobil, DATE_TRUNC('month', tanggal_jual)
        )
        SELECT *
        FROM RankedSales
        WHERE peringkat <= 5
        ORDER BY TO_DATE(bulan, 'Month YYYY')`

        const result = await sequelize.query(vehicles)
        res.json({
            data: result[0].map((data) => {
                return {
                    mobil: data.jenismobil,
                    bulan: convDate(data.tanggal, 'MMMM'),
                    tanggal: convDate(data.tanggal, 'DD-MM-YYYY'),
                    harga: data.sum_harga_terbentuk * 1,
                    peringkat: data.peringkat * 1
                }
            }),
            error: false,
            message: "OK - The request was successfull",
        });


    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})


const getVehicleTypeList = catchAsync(async (req, res) => {
    try {
        const vehicles = `select distinct jenismobil from cars`

        const result = await sequelize.query(vehicles)
        res.json({
            data: result[0].map((ctx) => {
                return {
                    id: ctx.jenismobil,
                    name: ctx.jenismobil
                }
            }),
            error: false,
            message: "OK - The request was successfull",
        });


    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

const getPriceComparison = catchAsync(async (req, res) => {
    const jenisMobil = req.query.jenisMobil

    try {
        const vehicles = `SELECT * FROM (
    SELECT jenisMobil, 
           TO_CHAR(DATE_TRUNC('month', tanggal_jual), 'Month') AS bulan, 
           DATE_TRUNC('month', tanggal_jual) AS tanggal,
           ROUND(AVG(harga_atas)) AS avg_top_price, 
           ROUND(AVG(harga_bawah)) AS avg_bottom_price, 
           ROUND(AVG(harga_terbentuk)) AS avg_actual_sold_price
    FROM cars where jenismobil like '${jenisMobil}%'
    GROUP BY jenisMobil, DATE_TRUNC('month', tanggal_jual)
) AS subquery
ORDER BY jenisMobil, tanggal;`

        const result = await sequelize.query(vehicles)
        res.json({
            data: result[0],
            error: false,
            message: "OK - The request was successfull",
            status: 200,
        });


    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

module.exports = {
    createSinglePredict,
    createBulkPredict,
    getVehicleList,
    getChart,
    updateVehicleData,
    getVehicleType,
    getCarCount,
    getCarTypeCount,
    getOmsetPenjualan,
    getVehicleRank,
    getVehicleTypeList,
    getPriceComparison,
}
