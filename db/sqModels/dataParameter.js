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


const dataParameter = sequelize.define('dataParameter', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  parameter: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Parameter cannot be null'
      },
      notEmpty: {
        msg: 'Parameter cannot be empty'
      }
    }
  },
  table_column: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Table Column cannot be null'
      },
      notEmpty: {
        msg: 'Table Column cannot be empty'
      }
    }
  },
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Email cannot be null'
      },
      notEmpty: {
        msg: 'Email cannot be empty'
      },
    }
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
    modelName: 'dataParameter',
    paranoid: true,
  });

module.exports = dataParameter