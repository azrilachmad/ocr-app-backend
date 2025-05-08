const express = require('express');
const { getAllDataSource, createDataSource, editDataSource, deleteDataSource } = require('../controllers/dataSourceController.js');
const { authentication } = require('../controllers/authController.js');

const router = express.Router()

router.get('/api/data-source/', authentication, getAllDataSource)
router.post('/api/data-source/create', authentication, createDataSource)
router.put('/api/data-source/edit/:id', authentication, editDataSource)
router.post('/api/data-source/delete/:id', authentication, deleteDataSource)

module.exports = router;