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


const scheduleLog = sequelize.define('scheduleLog', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Date cannot be null'
      },
      notEmpty: {
        msg: 'Date cannot be empty'
      }
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Log Type cannot be null'
      },
      notEmpty: {
        msg: 'Log Type cannot be empty'
      }
    }
  },
  total_data: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Total Data cannot be null'
      },
      notEmpty: {
        msg: 'Total Data cannot be empty'
      }
    }
  },
  total_token: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Total Token cannot be null'
      },
      notEmpty: {
        msg: 'Total Token cannot be empty'
      }
    }
  },
  average_token: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Average Token cannot be null'
      },
      notEmpty: {
        msg: 'Average Token cannot be empty'
      }
    }
  },
  user: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Duration cannot be null'
      },
      notEmpty: {
        msg: 'Duration cannot be empty'
      }
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
    modelName: 'scheduleLog',
    paranoid: true,
  });

module.exports = scheduleLog