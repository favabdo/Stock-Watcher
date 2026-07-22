const itemsRepository = require('../repositories/itemsRepository');

async function search(req, res, next) {
  try {
    const term = (req.query.q || '').trim();
    if (!term) return res.json([]);
    const items = await itemsRepository.searchItems(term);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const item = await itemsRepository.getItemById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function updateReorderQty(req, res, next) {
  try {
    const { reorderQty } = req.body;
    if (reorderQty === undefined || isNaN(Number(reorderQty))) {
      return res.status(400).json({ error: 'reorderQty لازم يكون رقم' });
    }
    const item = await itemsRepository.updateReorderQty(Number(req.params.id), Number(reorderQty));
    res.json(item);
  } catch (err) {
    next(err);
  }
}

module.exports = { search, getOne, updateReorderQty };
