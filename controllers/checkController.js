const stockCheckService = require('../services/stockCheckService');
const { getClientPoolAndConfig } = require('./itemsController');

async function checkStock(req, res, next) {
  try {
    const { pool, config } = await getClientPoolAndConfig(req);
    const notify = req.query.notify !== '0' && req.body?.notify !== false;
    const result = await stockCheckService.checkItemAcrossStores(
      pool,
      Number(req.params.id),
      config,
      { notify }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { checkStock };
