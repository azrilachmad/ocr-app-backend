const express = require('express');
const { getAllJobSchedule, editJobSchedule } = require('../controllers/jobScheduleController.js');
const { authentication } = require('../controllers/authController.js');

const router = express.Router()

router.get('/api/job-schedule/', authentication, getAllJobSchedule)
router.post('/api/job-schedule/edit/:id', authentication, editJobSchedule)

module.exports = router;