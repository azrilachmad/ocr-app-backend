const express = require('express');
const { getUser, getAllUser, createUser, editUser, deleteUser } = require('../controllers/userController.js');
const { authentication } = require('../controllers/authController.js');

const router = express.Router()

router.get('/api/userlist/', authentication, getAllUser)
router.get('/api/user/', authentication, getUser)
router.post('/api/user/create', authentication, createUser)
router.post('/api/user/edit/:id', authentication, editUser)
router.post('/api/user/delete/:id', authentication, deleteUser)

module.exports = router;