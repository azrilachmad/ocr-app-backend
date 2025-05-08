'use strict';
require('dotenv').config()

const {
  Model,
  Sequelize,
  DataTypes
} = require('sequelize');
const sequelize = require('../../config/db');
const bcrypt = require('bcrypt');
const AppError = require('../../utils/appError');


const user = sequelize.define('user', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  userType: {
    type: DataTypes.ENUM('0', '1', '2'),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'userType cannot be null'
      },
      notEmpty: {
        msg: 'userType cannot be empty'
      }
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Name cannot be null'
      },
      notEmpty: {
        msg: 'Name cannot be empty'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Email cannot be null'
      },
      notEmpty: {
        msg: 'Email cannot be empty'
      },
      isEmail: {
        msg: 'Invalid email id'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Password cannot be null'
      },
      notEmpty: {
        msg: 'Password cannot be empty'
      }
    }
  },
  confirmPassword: {
    type: DataTypes.VIRTUAL,
    set(value) {
      if (this.password.length < 7) {
        throw new AppError('Password length must be more than 7 characters', 400)
      }
      if (value === this.password) {
        const hashPassword = bcrypt.hashSync(value, 10);
        this.setDataValue('password', hashPassword)
      } else {
        throw new Error('Passwords do not match')
      }
    }
  },
  last_activity: {
    type: Sequelize.DATE
  },
  createdAt: {
    allowNull: false,
    type: DataTypes.DATE
  },
  updatedAt: {
    allowNull: false,
    type: DataTypes.DATE
  },
  deletedAt: {
    type: DataTypes.DATE
  },
},
  {
    freezeTableName: true,
    modelName: 'user',
    paranoid: true,
  });

module.exports = user