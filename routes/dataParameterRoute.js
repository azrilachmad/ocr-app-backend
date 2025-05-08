const express = require('express');
const { getAllDataParameter, createDataParameter, editDataParameter, deleteDataParameter, getVehicleColumns } = require('../controllers/dataParameterController.js');
const { authentication } = require('../controllers/authController.js');

const router = express.Router()

router.get('/api/data-parameter/get-column', authentication, getVehicleColumns)
router.get('/api/data-parameter/', authentication, getAllDataParameter)
router.post('/api/data-parameter/create', authentication, createDataParameter)
router.put('/api/data-parameter/edit/:id', authentication, editDataParameter)
router.post('/api/data-parameter/delete/:id', authentication, deleteDataParameter)

module.exports = router;