const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const clientAuth = require('../middleware/clientAuth');

router.post('/login', authController.login);
router.get('/me', clientAuth, authController.me);

module.exports = router;
