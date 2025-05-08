require('dotenv').config()
const Vehicle = require("../model/vehicleModel.js");
const { convDate } = require("../helper/index.js");
const catchAsync = require('../utils/catchAsync.js');
const sequelize = require("../config/db.js");
const { DataTypes, Op, Sequelize } = require("sequelize");
const scheduleLog = require('../db/sqModels/scheduleLog.js');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');


const generateToken = (payload) => {
    return JWT_EXPIRE_IN.sign(payload, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE_IN
    })
}

const getAllVehicleCount = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query
    try {
        const vehicles = await Vehicle.count({
            where: {
                created_at: {
                    [Op.between]: [new Date(startDate).setHours(0, 0, 0), new Date(endDate).setHours(23, 59, 59)] // Replace startDate and endDate with your actual values
                }
            }
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

const getToBeProcessedData = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query
    try {
        const vehicles = await Vehicle.count({
            where: {
                hit_count: { 
                    [Op.eq]: 0, 
                    [Op.eq]: null,
                }, // Kondisi hit_count < 2,
                created_at: {
                    [Op.between]: [new Date(startDate).setHours(0, 0, 0), new Date(endDate).setHours(23, 59, 59)] // Replace startDate and endDate with your actual values
                }
            },
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

const getProcessedData = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query
    try {
        const vehicles = await Vehicle.count({
            where: {
                hit_count: { [Op.gt]: 0 }, // Kondisi hit_count > 0
                checked_date: {
                    [Op.between]: [new Date(startDate).setHours(0, 0, 0), new Date(endDate).setHours(23, 59, 59)] // Replace startDate and endDate with your actual values
                }
            },
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

const getLogData = (async (req, res) => {


    try {
        const { startDate, endDate } = req.query

        const chart1Data = await scheduleLog.findAndCountAll({
            where: {
                createdAt: {
                    [Op.between]: [new Date(startDate).setHours(0, 0, 0), new Date(endDate).setHours(23, 59, 59)] // Replace startDate and endDate with your actual values
                }
            },
            order: [['createdAt', 'ASC']]
        });
        res.json({
            data: chart1Data.rows,
            total: chart1Data.count,
            error: false,
            message: "OK - The request was successfull",
        });

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Internal Server Error" })
    }
})


module.exports = {
    getAllVehicleCount,
    getToBeProcessedData,
    getProcessedData,
    getLogData
}