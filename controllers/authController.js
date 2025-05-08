require('dotenv').config()
const user = require('../db/sqModels/user')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const sequelize = require('../config/db')


const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE_IN
    })
}

const signUp = catchAsync(async (req, res, next) => {
    const body = req.body;

    if (!['1', '2'].includes(body.userType)) {
        throw new AppError('Invalid User Type', 400)
    }

    if (body.password !== body.confirmPassword) return res.status(400).json({
        status: 'Failed',
        message: "Password does not match"
    })

    const newUser = await user.create({
        userType: body.userType,
        name: body.name,
        email: body.email,
        password: body.password,
        confirmPassword: body.confirmPassword
    });

    if (!newUser) {
        throw new AppError('Failed to create the user', 400)
    }

    const result = newUser.toJSON()

    delete result.password
    delete result.deletedAt

    result.token = generateToken({
        id: result.id
    })

    return res.status(201).json({
        status: 'Success',
        data: result,
    })
})

const signIn = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400))
    }

    const result = await user.findOne({ where: { email: email } })
    if (!result || !(await bcrypt.compare(password, result.password))) {
        return next(new AppError('Incorrect email or password', 400))
    }

    const token = jwt.sign({ id: result.id }, process.env.JWT_SECRET_KEY)

    res.cookie('jwt', token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 Day
    })

    return res.json({
        data: {
            status: 'Success',
            token,
        }
    })
})


const logout = catchAsync(async (req, res, next) => {
    res.cookie('jwt', '', { maxAge: 0 })

    res.json({
        message: 'Successfully logged out'
    })
})

const authentication = catchAsync(async (req, res, next) => {
    // 1. Get token from headers
    let idToken = ''
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // bearer token
        idToken = req.headers.authorization.split(' ')[1]
    }
    if (!idToken) {
        return next(new AppError('Please login to get access', 401))
    }

    // 2. Token verification
    const tokenDetail = jwt.verify(idToken, process.env.JWT_SECRET_KEY)
    // 3. Get the user detail drom db and add to req object
    const freshUser = user.findByPk(tokenDetail.id)
    user.update({ id: tokenDetail.id, last_activity: sequelize.literal('CURRENT_TIMESTAMP') }, { where: { id: tokenDetail.id } });

    if (!freshUser) {
        return next(new AppError('User no longer exists', 400))
    }


    req.user = freshUser;
    return next()
})

const restrictTo = (...userType) => {
    const checkPermission = async (req, res, next) => {

        const role = await req.user

        if (!userType.includes(role.dataValues.userType)) {
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        return next()
    }
    return checkPermission;
}


module.exports = { signUp, signIn, logout, authentication, restrictTo }
