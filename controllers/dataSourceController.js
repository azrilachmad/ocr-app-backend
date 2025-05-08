require('dotenv').config()
const dataSource = require('../db/sqModels/dataSource')
const catchAsync = require("../utils/catchAsync");
const AppError = require('../utils/appError')
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt')


const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE_IN
    })
}

const getAllDataSource = catchAsync(async (req, res, next) => {

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


    const dataSourceList = await dataSource.findAndCountAll({ limit: limitAsNumber, offset: page === 1 ? 0 : (pageAsNumber - 1) * limitAsNumber, order: [[sortBy, order]] })

    res.json({
        data: dataSourceList.rows,
        error: false,
        message: "OK - The request was successfull",
        meta: {
            page: req.query.page,
            perPage: limit.toString(),
            total: dataSourceList.count,
            totalPages: Math.ceil(dataSourceList.count / limit)
        }
    })
})


const createDataSource = catchAsync(async (req, res, next) => {
    // Validation inside controller
    await body('marketplace_name')
        .notEmpty()
        .withMessage('Marketplace name is required')
        .custom(async (value) => {
            if (value) {
                const marketplaceExist = await dataSource.findOne({ where: { marketplace_name: value } });
                if (marketplaceExist) {
                    throw new Error('Marketplace name already exists');
                }
            }
        })
        .run(req);

    await body('address')
        .notEmpty()
        .withMessage('Address is required')
        .custom(async (value) => {
            if (value) {
                const addressExist = await dataSource.findOne({ where: { address: value } });
                if (addressExist) {
                    throw new Error('Adress name already exists');
                }
            }
        })
        .run(req);

    await body('status')
        .notEmpty()
        .withMessage('Address is required')
        .isBoolean()
        .withMessage('Invalid value for Address')
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

    const { marketplace_name, address, status } = req.body;

    const newDataSource = await dataSource.create({
        marketplace_name,
        address,
        status,
    });

    if (!newDataSource) {
        throw new AppError('Failed to create data source', 400);
    }

    const result = newDataSource.toJSON();
    delete result.deletedAt;

    return res.status(201).json({
        status: 'Success',
        data: result,
    });
});


const editDataSource = catchAsync(async (req, res, next) => {
    // Find the user by ID from the route marketplace_name
    const existingDataSource = await dataSource.findByPk(req.params.id);
    if (!existingDataSource) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Data Source not found',
        });
    }

    // Validation inside controller
    await body('marketplace_name')
        .notEmpty()
        .withMessage('Marketplace Name is required')
        .custom(async (value) => {
            if (value) {
                const marketplaceExist = await dataSource.findOne({
                    where: { marketplace_name: value, id: { [Op.ne]: req.params.id } }
                });
                if (marketplaceExist) {
                    throw new Error('Marketplace Name already exists');
                }
            }
        })
        .run(req);

    await body('address')
        .notEmpty()
        .withMessage('Address is required')
        .custom(async (value) => {
            if (value) {
                const addressExist = await dataSource.findOne({
                    where: { address: value, id: { [Op.ne]: req.params.id } }
                });
                if (addressExist) {
                    throw new Error('Address name already exists');
                }
            }
        })
        .run(req);

    await body('status')
        .notEmpty()
        .withMessage('Address is required')
        .isBoolean()
        .withMessage('Invalid value for Address')
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
    const { marketplace_name, address, status } = req.body;

    // Use update method instead of save to ensure only existing users are updated
    const updateData = {};

    if (marketplace_name !== undefined) updateData.marketplace_name = marketplace_name;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status; // Allow false and 0


    const [updatedRowsCount] = await dataSource.update(updateData, {
        where: { id: req.params.id },
    });

    if (updatedRowsCount === 0) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Data Source not found',
        });
    }

    const updatedDataSource = await dataSource.findByPk(req.params.id);

    if (!updatedDataSource) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Failed to fetch updated data',
        });
    }

    // Exclude sensitive fields
    const updatedDataSourceJSON = updatedDataSource.toJSON();
    delete updatedDataSourceJSON.deletedAt;

    return res.status(200).json({
        status: 'Success',
        data: updatedDataSourceJSON,
    });
});

const deleteDataSource = catchAsync(async (req, res, next) => {
    // Find the user by ID from the route marketplace_name
    const dataToDelete = await dataSource.findByPk(req.params.id);
    if (!dataToDelete) {
        return res.status(404).json({
            status: 'Failed',
            message: 'Data Source not found',
        });
    }

    // Soft delete the user (this sets the deletedAt field)
    await dataToDelete.destroy(); // This will mark the record as deleted

    return res.status(200).json({
        status: 'Success',
        message: 'Data Source deleted successfully',
    });
});




module.exports = { getAllDataSource, createDataSource, editDataSource, deleteDataSource }
