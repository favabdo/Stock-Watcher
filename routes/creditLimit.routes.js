const express = require('express');
const router = express.Router();
const creditLimitController = require('../controllers/creditLimitController');
const clientAuth = require('../middleware/clientAuth');

router.use(clientAuth);

router.get('/over-limit', creditLimitController.getOverCreditLimit);

module.exports = router;
