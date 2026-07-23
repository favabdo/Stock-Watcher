const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const adminAuth = require('../middleware/adminAuth');

router.post('/login', adminAuthController.login);
router.get('/me', adminAuth, adminAuthController.me);
router.get('/admins', adminAuth, adminAuthController.list);
router.post('/admins', adminAuth, adminAuthController.createAdmin);

module.exports = router;
