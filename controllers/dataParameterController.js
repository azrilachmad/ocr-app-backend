require('dotenv').config()
const dataParameter = require('../db/sqModels/dataParameter')
const catchAsync = require("../utils/catchAsync");
const AppError = require('../utils/appError')
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../config/db');


const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE_IN
    })
}

const getVehicleColumns = catchAsync(async (req, res, next) => {
    const columns = await sequelize.query(
        `SHOW COLUMNS FROM vehicle_price_check_ai;`,
        { type: sequelize.QueryTypes.SHOW }
    );

    const filtered = columns[0].map((data) => {
        return { id: data.Field, name: data.Field }
    })
    res.json({
        data: filtered,
        error: false,
        message: "OK - The request was successfull",
    })

})

const getAllDataParameter = catchAsync(async (req, res, next) => {

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


    const dataParameterList = await dataParameter.findAndCountAll({ limit: limitAsNumber, offset: page === 1 ? 0 : (pageAsNumber - 1) * limitAsNumber, order: [[sortBy, order]] })

    res.json({
        data: dataParameterList.rows,
        error: false,
        message: "OK - The request was successfull",
        meta: {
            page: req.query.page,
            perPage: limit.toString(),
            total: dataParameterList.count,
            totalPages: Math.ceil(dataParameterList.count / limit)
        }
    })
})


const createDataParameter = catchAsync(async (req, res, next) => {
    // Validation inside controller
    await body('parameter')
        .notEmpty()
        .withMessage('Parameter is required')
        .custom(async (value) => {
            if (value) {
                const parameterExist = await dataParameter.findOne({ where: { parameter: value } });
                if (parameterExist) {
                    throw new Error('Parameter name already exists');
                }
            }
        })
        .run(req);

    await body('table_column')
        .notEmpty()
        .withMessage('Table Column is required')
        .custom(async (value) => {
            if (value) {
                const columnExist = await dataParameter.findOne({ where: { table_column: value } });
                if (columnExist) {
                    throw new Error('Table Column name already exists');
                }
            }
        })
        .run(req);

    await body('status')
        .notEmpty()
        .withMessage('Table Column is required')
        .isBoolean()
        .withMessage('Invalid value for Table Column')
        .run(req);

    // Check validation result after running all validators
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Format errors into a single object
        const formattedErrors = errors.array().reduce((acc, error) => {
            acc[error.path] = error.msg; // Map field to message
            return acc;
        }, {});

        return res.status(400).json({
            status: 'Failed',
            errors: formattedErrors,
        });
    }

    const { parameter, table_column, status } = req.body;

    const newDataParameter = await dataParameter.create({
        parameter,
        table_column,
        status,
    });

    if (!newDataParameter) {
        throw new AppError('Failed to create data parameter', 400);
    }

    const result = newDataParameter.toJSON();
    delete result.deletedAt;

    return res.status(201).json({
        status: 'Success',
        data: result,
    });
});


const editDataParameter = catchAsync(async (req, res, next) => {
    // Find the user by ID from the route parameter
    const existingDataParameter = await dataParameter.findByPk(req.params.id);
    if (!existingDataParameter) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Data Parameter not found',
        });
    }

    // Validation inside controller
    await body('parameter')
        .notEmpty()
        .withMessage('Parameter is required')
        .custom(async (value) => {
            if (value) {
                const parameterExist = await dataParameter.findOne({
                    where: { parameter: value, id: { [Op.ne]: req.params.id } }
                });
                if (parameterExist) {
                    throw new Error('Parameter name already exists');
                }
            }
        })
        .run(req);

    await body('table_column')
        .notEmpty()
        .withMessage('Table Column is required')
        .custom(async (value) => {
            if (value) {
                const columnExist = await dataParameter.findOne({
                    where: { table_column: value, id: { [Op.ne]: req.params.id } }
                });
                if (columnExist) {
                    throw new Error('Table Column name already exists');
                }
            }
        })
        .run(req);

    await body('status')
        .notEmpty()
        .withMessage('Table Column is required')
        .isBoolean()
        .withMessage('Invalid value for Table Column')
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

    // Update the user with validated fields
    const { parameter, table_column, status } = req.body;

    // Use update method instead of save to ensure only existing users are updated
    const updateData = {};

    if (parameter !== undefined) updateData.parameter = parameter;
    if (table_column !== undefined) updateData.table_column = table_column;
    if (status !== undefined) updateData.status = status; // Allow false and 0


    const [updatedRowsCount] = await dataParameter.update(updateData, {
        where: { id: req.params.id },
    });

    if (updatedRowsCount === 0) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Data Parameter not found',
        });
    }

    // Fetch the updated data manually
    const updatedDataParameter = await dataParameter.findByPk(req.params.id);

    if (!updatedDataParameter) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Failed to fetch updated data',
        });
    }

    // Exclude sensitive fields
    const updatedDataParameterJSON = updatedDataParameter.toJSON();
    delete updatedDataParameterJSON.deletedAt;

    return res.status(200).json({
        status: 'Success',
        data: updatedDataParameterJSON,
    });
});

const deleteDataParameter = catchAsync(async (req, res, next) => {
    // Find the user by ID from the route parameter
    const dataToDelete = await dataParameter.findByPk(req.params.id);
    if (!dataToDelete) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Data Parameter not found',
        });
    }

    // Soft delete the user (this sets the deletedAt field)
    await dataToDelete.destroy(); // This will mark the record as deleted

    return res.status(200).json({
        status: 'Success',
        message: 'Data Parameter deleted successfully',
    });
});




module.exports = { getVehicleColumns, getAllDataParameter, createDataParameter, editDataParameter, deleteDataParameter }
