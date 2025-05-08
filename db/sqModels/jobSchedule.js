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


const jobSchedule = sequelize.define('jobSchedule', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  job_schedule: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Job Schedule cannot be null'
      },
      notEmpty: {
        msg: 'Job Schedule cannot be empty'
      }
    }
  },
  time: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Time cannot be null'
      },
      notEmpty: {
        msg: 'Time cannot be empty'
      }
    }
  },
  max_record: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Max Record cannot be null'
      },
      notEmpty: {
        msg: 'Max Record cannot be empty'
      },
    }
  },
  ai_iqr: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'IQR multipliier number cannot be null'
      },
      notEmpty: {
        msg: 'IQR multipliier number cannot be empty'
      },
    }
  },
  ai_temp: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'AI temperature number cannot be null'
      },
      notEmpty: {
        msg: 'IQR temperature number cannot be empty'
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
    modelName: 'jobSchedule',
    paranoid: true,
  });

module.exports = jobSchedule