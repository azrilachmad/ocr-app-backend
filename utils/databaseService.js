'use strict';

const { Invoice } = require('../db/sqModels'); // Or require('../db/sqModels/index.js');

/**
 * Saves invoice data to the database.
 * @param {object} invoiceDetails - The details of the invoice to save.
 * @param {string} invoiceDetails.fileName - The original name of the invoice file.
 * @param {string} invoiceDetails.processedFileType - The MIME type of the processed file.
 * @param {object} invoiceDetails.extractedData - The JSON data extracted from the invoice.
 * @returns {Promise<object>} The created invoice record from Sequelize.
 * @throws {Error} If saving to the database fails.
 */
const saveInvoiceData = async (invoiceDetails) => {
  try {
    const newInvoice = await Invoice.create(invoiceDetails);
    console.log('Invoice data saved successfully:', newInvoice.toJSON());
    return newInvoice;
  } catch (error) {
    console.error('Error saving invoice data to database:', error);
    // Re-throw the error to be handled by the caller (e.g., the controller)
    // This allows the controller to decide how to respond to the client.
    throw new Error('Failed to save invoice data to database.');
  }
};

module.exports = { saveInvoiceData };