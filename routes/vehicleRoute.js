const { createBulkPredict, createSinglePredict, getCarCount, getCarTypeCount, getChart, getOmsetPenjualan, getPriceComparison, getVehicleList, getVehicleRank, getVehicleType, getVehicleTypeList, updateVehicleData } = require('../controllers/vehicleController.js');
const { authentication, restrictTo } = require('../controllers/authController.js');

const router = require('express').Router()

router.post('/api/vehicle/predict', authentication, createSinglePredict)
router.get('/api/chart/', getChart)
router.get('/api/vehicles/', authentication, getVehicleList)
router.get('/api/vehicles/count', authentication, getCarCount)
router.get('/api/vehicles/count-type', authentication, getCarTypeCount)
router.get('/api/vehicles/omset', authentication, getOmsetPenjualan)
router.get('/api/vehicles/sales', authentication, getVehicleRank)
router.get('/api/vehicles/car-type', authentication, getVehicleType)
router.get('/api/vehicles/list', authentication, getVehicleTypeList)
router.get('/api/vehicles/comparison', authentication, getPriceComparison)
router.put('/api/vehicles', authentication, updateVehicleData)
router.post('/api/bulk-predict', authentication, createBulkPredict)

module.exports = router;