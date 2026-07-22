const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');
const checkController = require('../controllers/checkController');

router.get('/search', itemsController.search);
router.get('/low-stock', itemsController.getLowStock);
router.get('/:id', itemsController.getOne);
router.put('/:id/reorder-qty', itemsController.updateReorderQty);
router.post('/:id/check-stock', checkController.checkStock);

module.exports = router;
