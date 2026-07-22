const stockCheckService = require('../services/stockCheckService');

async function checkStock(req, res, next) {
  try {
    const result = await stockCheckService.checkItemAcrossBranches(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { checkStock };
