require('dotenv').config()
const jobSchedule = require('../db/sqModels/jobSchedule')
const catchAsync = require("../utils/catchAsync");
const AppError = require('../utils/appError')
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { convDate } = require('../helper');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require("dayjs/plugin/timezone");


const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE_IN
    })
}

const getAllJobSchedule = catchAsync(async (req, res, next) => {

    const pageAsNumber = parseInt(req.query.page) || 1;
    const limitAsNumber = parseInt(req.query.limit) || 10;
    const order = req.query.order || 'asc';
    sortBy = req.query.sortBy || 'updatedAt'

    let page = 0;
    if (!Number.isNaN(pageAsNumber) && pageAsNumber > 0) {
        page = pageAsNumber;
    }

    let limit = 10;
    if (!Number.isNaN(limitAsNumber) && limitAsNumber > 0) {
        page = limitAsNumber;
    }


    const jobScheduleData = await jobSchedule.findAndCountAll({ limit: limitAsNumber, offset: page === 1 ? 0 : (pageAsNumber - 1) * limitAsNumber, order: [[sortBy, order]] })

    res.json({
        data: jobScheduleData.rows[0],
        error: false,
        message: "OK - The request was successfull",
        meta: {
            page: req.query.page,
            perPage: limit.toString(),
            total: jobScheduleData.count,
            totalPages: Math.ceil(jobScheduleData.count / limit)
        }
    })
})


const editJobSchedule = catchAsync(async (req, res, next) => {
    // Find the job schedule by ID
    const existingJobSchedule = await jobSchedule.findByPk(req.params.id);
    if (!existingJobSchedule) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Data Source not found',
        });
    }

    // Validation inside controller
    await body('job_schedule')
        .notEmpty()
        .withMessage('Job Schedule is required')
        .custom(async (value) => {
            if (value) {
                const marketplaceExist = await jobSchedule.findOne({
                    where: { job_schedule: value, id: { [Op.ne]: req.params.id } },
                });
                if (marketplaceExist) {
                    throw new Error('Marketplace Name already exists');
                }
            }
        })
        .run(req);

    await body('time')
        .notEmpty()
        .withMessage('Time is required')
        .custom(async (value) => {
            if (value) {
                const timeExist = await jobSchedule.findOne({
                    where: { time: value, id: { [Op.ne]: req.params.id } },
                });
                if (timeExist) {
                    throw new Error('Address name already exists');
                }
            }
        })
        .run(req);

    await body('max_record')
        .notEmpty()
        .withMessage('Max Record is required')
        .run(req);

    await body('ai_iqr')
        .notEmpty()
        .withMessage('IQR multiplier number is required')
        .run(req);
    await body('ai_temp')
        .notEmpty()
        .withMessage('AI Temperature is required')
        .run(req);

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().reduce((acc, error) => {
            acc[error.path] = error.msg;
            return acc;
        }, {});

        return res.status(400).json({
            status: 'Failed',
            errors: formattedErrors,
        });
    }

    // Update the job schedule with validated fields
    const { job_schedule, time, max_record, ai_iqr, ai_temp } = req.body;




    const updateData = {};
    if (job_schedule) updateData.job_schedule = job_schedule;
    if (time) updateData.time = dayjs.tz(time, "Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
    if (max_record) updateData.max_record = max_record;
    if (ai_iqr) updateData.ai_iqr = ai_iqr;
    if (ai_temp) updateData.ai_temp = ai_temp;
    console.log(updateData.time)

    const [updatedRowsCount] = await jobSchedule.update(updateData, {
        where: { id: req.params.id },
    });

    if (updatedRowsCount === 0) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Job Schedule not found',
        });
    }

    // Fetch the updated record manually
    const updatedJobSchedule = await jobSchedule.findByPk(req.params.id);

    return res.status(200).json({
        status: 'Success',
        data: updatedJobSchedule,
    });
});






module.exports = { getAllJobSchedule, editJobSchedule, }
