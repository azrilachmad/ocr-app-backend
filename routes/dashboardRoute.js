const { authentication, restrictTo } = require('../controllers/authController.js');
const { getAllVehicleCount, getToBeProcessedData, getProcessedData, getAITokenChart, getLogData } = require('../controllers/dashboardController.js');

const router = require('express').Router()

router.get('/api/dashboard/card1/', authentication, getAllVehicleCount)
router.get('/api/dashboard/card2/', authentication, getToBeProcessedData)
router.get('/api/dashboard/card3/', authentication, getProcessedData)

router.get('/api/dashboard/schedule-log/', authentication, getLogData)


module.exports = router;