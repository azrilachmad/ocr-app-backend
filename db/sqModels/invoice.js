'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here if any in the future
    }
  }
  Invoice.init({
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    processedFileType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    extractedData: {
      type: DataTypes.JSON,
      allowNull: true // Allowing null if extraction yields nothing or for flexibility
    }
  }, {
    sequelize,
    modelName: 'Invoice',
    //tableName: 'Invoices' // Optional: Sequelize will pluralize 'Invoice' to 'Invoices'
  });
  return Invoice;
};