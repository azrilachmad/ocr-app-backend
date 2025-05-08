require('dotenv').config()
const user = require('../db/sqModels/user')
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

const getAllUser = catchAsync(async (req, res, next) => {

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


    const userList = await user.findAndCountAll({ limit: limitAsNumber, offset: page === 1 ? 0 : (pageAsNumber - 1) * limitAsNumber, order: [[sortBy, order]] })

    res.json({
        data: userList.rows,
        error: false,
        message: "OK - The request was successfull",
        meta: {
            page: req.query.page,
            perPage: limit.toString(),
            total: userList.count,
            totalPages: Math.ceil(userList.count / limit)
        }
    })
})

const getUser = catchAsync(async (req, res, next) => {
    // Step 1: Extract token from Authorization header
    const token = req.header('authorization');
    if (!token) {
        return next(new AppError('Unauthenticated: No token provided', 401));
    }

    // Step 2: Remove 'Bearer ' prefix and verify the token
    const cookie = token.replace('Bearer ', '');

    let claims;
    try {
        claims = jwt.verify(cookie, process.env.JWT_SECRET_KEY);
    } catch (error) {
        return next(new AppError('Invalid or expired token', 401));
    }

    // Step 3: Check if token contains the user id
    if (!claims || !claims.id) {
        return next(new AppError('Unauthorized: Invalid token', 401));
    }

    // Step 4: Fetch user data from database using the decoded id
    const userData = await user.findOne({
        where: { id: claims.id }, // Correct usage of `where`
    });

    if (!userData) {
        return next(new AppError('User not found', 404));
    }

    // Step 5: Exclude sensitive data like password, timestamps, etc.
    const { password, createdAt, deletedAt, updatedAt, ...data } = await userData.toJSON();

    // Step 6: Return user data excluding sensitive fields
    return res.json({
        status: 'Success',
        data,
    });
});

const createUser = catchAsync(async (req, res, next) => {
    // Validation inside controller
    await body('userType')
        .notEmpty()
        .withMessage('Role is required')
        .run(req);

    await body('email')
        .notEmpty()
        .withMessage('Email is required')
        .bail()
        .isEmail()
        .withMessage('Invalid email address')
        .bail()
        .custom(async (value) => {
            if (value) {
                const userExist = await user.findOne({ where: { email: value } });
                if (userExist) {
                    throw new Error('Email already exists');
                }
            }
        })
        .run(req);

    await body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .run(req);

    await body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match')
        .run(req);

    await body('name')
        .notEmpty()
        .withMessage('Name is required')
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

    const { userType, name, email, password } = req.body;

    // Hash the password before saving the user
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await user.create({
        userType,
        name,
        email,
        password: hashedPassword,
    });

    if (!newUser) {
        throw new AppError('Failed to create the user', 400);
    }

    const result = newUser.toJSON();
    delete result.password;
    delete result.deletedAt;

    result.token = generateToken({ id: result.id });

    return res.status(201).json({
        status: 'Success',
        data: result,
    });
});


const editUser = catchAsync(async (req, res, next) => {
    // Find the user by ID from the route parameter
    const existingUser = await user.findByPk(req.params.id);
    if (!existingUser) {
        return res.status(404).json({
            status: 'Failed',
            message: 'User not found',
        });
    } else {

        // Validation for updating user fields
        await body('userType')
            .notEmpty() // Allow this field to be optional
            .notEmpty()
            .withMessage('Role is required')
            .run(req);

        await body('email')
            .notEmpty() // Allow this field to be optional
            .isEmail()
            .withMessage('Invalid email address')
            .bail()
            .custom(async (value, { req }) => {
                if (value) {
                    // Skip validation if the email is the same as the current email
                    if (value === existingUser.email) {
                        return true;
                    }

                    // Check if the email is already in use by another user
                    const userExist = await user.findOne({
                        where: { email: value, id: { [Op.ne]: req.params.id } }
                    });
                    if (userExist) {
                        throw new Error('Email already exists');
                    }
                }
            })
            .run(req);

        await body('password')
            .notEmpty()
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .run(req);

        await body('confirmPassword')
            .notEmpty()
            .custom((value, { req }) => value === req.body.password)
            .withMessage('Passwords do not match')
            .run(req);

        await body('name')
            .optional()
            .notEmpty()
            .withMessage('Name is required')
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
        const { userType, name, email, password } = req.body;

        // Use update method instead of save to ensure only existing users are updated
        const updateData = {};

        if (userType) updateData.userType = userType;
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password) updateData.password = bcrypt.hashSync(password, 10);

        const [updatedRowsCount] = await user.update(updateData, {
            where: { id: req.params.id },
        });

        if (updatedRowsCount === 0) {
            return res.status(404).json({
                status: 'Failed',
                message: 'User not found',
            });
        }

        const updatedUser = await user.findByPk(req.params.id);

        if (!updatedUser) {
            return res.status(404).json({
                status: 'Failed',
                message: 'Failed to fetch updated data',
            });
        }

        // Exclude sensitive fields
        const updatedUserJSON = updatedUser.toJSON();
        delete updatedUserJSON.deletedAt;

        return res.status(200).json({
            status: 'Success',
            data: updatedUserJSON,
        });
    }

});

const deleteUser = catchAsync(async (req, res, next) => {
    // Find the user by ID from the route parameter
    const userToDelete = await user.findByPk(req.params.id);
    if (!userToDelete) {
        return res.status(404).json({
            status: 'Failed',
            message: 'User not found',
        });
    }

    // Soft delete the user (this sets the deletedAt field)
    await userToDelete.destroy(); // This will mark the record as deleted

    return res.status(200).json({
        status: 'Success',
        message: 'User deleted successfully',
    });
});




module.exports = { getUser, getAllUser, createUser, editUser, deleteUser }
