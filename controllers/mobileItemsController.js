const stockCheckService = require('../services/stockCheckService');
const { getClientPool } = require('./itemsController');
const { httpError } = require('../utils/apiError');

// قراءة فقط: لا ترسل واتساب. الموبايل بيستدعيها عند فتح صنف.
async function getStock(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw httpError(400, 'VALIDATION_ERROR', 'id غير صالح');
    const pool = await getClientPool(req);
    const result = await stockCheckService.getItemStock(pool, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStock };
