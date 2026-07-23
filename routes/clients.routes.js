const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');
const adminAuth = require('../middleware/adminAuth');

router.use(adminAuth);

router.get('/', clientsController.list);
router.post('/', clientsController.create);
router.put('/:id', clientsController.update);
router.delete('/:id', clientsController.remove);
router.post('/:id/check-now', clientsController.checkNow);

module.exports = router;
