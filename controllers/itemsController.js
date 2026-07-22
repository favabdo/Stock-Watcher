const clientsRepository = require('../repositories/clientsRepository');
const clientPoolManager = require('../services/clientPoolManager');
const itemsRepository = require('../repositories/itemsRepository');
const multiClientCheckService = require('../services/multiClientCheckService');

// بيرجع الـ connection pool بتاع قاعدة بيانات العميل المسجل دخول حاليًا
// (req.client جاي من middleware/clientAuth) - مش قاعدة البيانات المشتركة بتاعة
// السيرفر (اللي فيها جدول StockWatcherUsers_byA بس)
async function getClientPool(req) {
  const { pool } = await getClientPoolAndConfig(req);
  return pool;
}

// زي getClientPool بالظبط بس بيرجع كمان بيانات العميل (clientName,
// whatsappPhone, ...) - مطلوبة في checkController عشان تقدر تبعت رسالة
// واتساب التنبيه بنفس اسم/رقم العميل زي الفحص التلقائي في الصفحة الرئيسية.
async function getClientPoolAndConfig(req) {
  const fullConfig = await clientsRepository.getClientConnectionConfig(req.client.id);
  if (!fullConfig || !fullConfig.isActive) {
    const err = new Error('العميل غير موجود أو متوقف');
    err.status = 404;
    throw err;
  }
  const pool = await clientPoolManager.getPoolForClient(fullConfig);
  return { pool, config: fullConfig };
}

async function search(req, res, next) {
  try {
    const term = (req.query.q || '').trim();
    if (!term) return res.json([]);
    const pool = await getClientPool(req);
    const items = await itemsRepository.searchItems(pool, term);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const pool = await getClientPool(req);
    const item = await itemsRepository.getItemById(pool, Number(req.params.id));
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
    const pool = await getClientPool(req);
    const item = await itemsRepository.updateReorderQty(pool, Number(req.params.id), Number(reorderQty));
    res.json(item);
  } catch (err) {
    next(err);
  }
}

// كل الأصناف اللي وصلت لحد إعادة الطلب أو أقل في فرع واحد على الأقل بتاعة العميل
// المسجل دخول حاليًا بس، مجمّعة حسب الصنف (كل صنف مع كل الفروع اللي تحت الحد بتاعته).
// ده اللي بيتعرض في الصفحة الرئيسية أول ما العميل يسجل دخول.
async function getLowStock(req, res, next) {
  try {
    const pool = await getClientPool(req);
    const rows = await multiClientCheckService.checkAllItemsAcrossBranches(pool);

    const byItem = new Map();
    for (const { item, branchID, row } of rows) {
      if (!byItem.has(item.ID)) {
        byItem.set(item.ID, { item, branches: [] });
      }
      byItem.get(item.ID).branches.push({ branchID, stock: row.Stock });
    }

    res.json(Array.from(byItem.values()));
  } catch (err) {
    next(err);
  }
}

module.exports = { search, getOne, updateReorderQty, getLowStock, getClientPool, getClientPoolAndConfig };
