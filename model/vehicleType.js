const { Sequelize, DataTypes } = require("sequelize");
const db = require("../config/db.js");
require('dotenv').config()


const CarsType = db.define('Cars', {
    jenismobil: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'cars',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    schema: 'public',
    // freezeTableName: true
});

module.exports = CarsType;
(async () => {
    await db.sync();
})();
