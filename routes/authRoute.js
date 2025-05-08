const express = require('express');
const { signIn, signUp, authentication, logout } = require('../controllers/authController.js');

const router = express.Router()

router.post('/api/register/', signUp)
router.post('/api/login/', signIn)
router.post('/api/logout/', logout)

module.exports = router;