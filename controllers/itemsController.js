const clientsRepository = require('../repositories/clientsRepository');
const clientPoolManager = require('../services/clientPoolManager');
const itemsRepository = require('../repositories/itemsRepository');
const multiClientCheckService = require('../services/multiClientCheckService');

// كاش في الذاكرة لنتيجة الفحص الشامل (getLowStock) لكل عميل - عشان الصفحة
// الرئيسية تفتح بسرعة، بدل ما تعمل الفحص الكامل (كل صنف × كل فرع، مئات/آلاف
// النداءات لقاعدة البيانات) من الصفر في كل مرة العميل يفتح الصفحة.
//
// أسلوب "stale-while-revalidate": لو الكاش موجود وقديم (أكبر من CACHE_TTL_MS)،
// بنرجّع النسخة القديمة فورًا للمستخدم (أسرع بكتير من الانتظار)، وفي نفس الوقت
// بنبدأ تحديث في الخلفية بحيث الطلب اللي بعده ياخد بيانات جديدة. أول طلب لعميل
// معين (مفيش كاش خالص) لسه بينتظر النتيجة الحقيقية زي الأول.
//
// قابل للتعديل عن طريق LOW_STOCK_CACHE_TTL_MS (بالمللي ثانية). القيمة
// الافتراضية 5 دقايق - توازن بين سرعة الفتح وحداثة البيانات. لو عايز البيانات
// تفضل فورية دايمًا (على حساب السرعة)، سيبها = 0.
const LOW_STOCK_CACHE_TTL_MS = Number(process.env.LOW_STOCK_CACHE_TTL_MS) || 5 * 60 * 1000;
const lowStockCache = new Map(); // clientId -> { rows, timestamp, refreshing }

async function getLowStockRowsCached(clientId, pool) {
  const cached = lowStockCache.get(clientId);
  const now = Date.now();

  if (cached && now - cached.timestamp < LOW_STOCK_CACHE_TTL_MS) {
    return cached.rows; // لسه طازة - رجّعها من غير أي نداء لقاعدة البيانات
  }

  if (cached) {
    // موجودة بس قديمة - رجّع القديمة فورًا وحدّثها في الخلفية (مرة واحدة بس)
    if (!cached.refreshing) {
      cached.refreshing = true;
      multiClientCheckService
        .checkAllItemsAcrossBranches(pool)
        .then((freshRows) => {
          lowStockCache.set(clientId, { rows: freshRows, timestamp: Date.now(), refreshing: false });
        })
        .catch((err) => {
          console.error(`[LowStockCache] فشل تحديث الكاش في الخلفية للعميل ${clientId}:`, err.message);
          cached.refreshing = false; // نسمح بمحاولة تانية في الطلب اللي بعده
        });
    }
    return cached.rows;
  }

  // مفيش كاش خالص (أول مرة) - لازم ننتظر الفحص الحقيقي زي الأول
  const freshRows = await multiClientCheckService.checkAllItemsAcrossBranches(pool);
  lowStockCache.set(clientId, { rows: freshRows, timestamp: Date.now(), refreshing: false });
  return freshRows;
}

// بيمسح الكاش الخاص بعميل معين - لازم تتنده بعد أي تعديل ممكن يغيّر نتيجة
// الفحص (زي تعديل ReorderQty) عشان العميل مايشوفش بيانات قديمة غلط.
function invalidateLowStockCache(clientId) {
  lowStockCache.delete(clientId);
}

// بيحدّث الكاش مباشرة ببيانات فحص جاهزة (بدل ما نمسحه ونخلي أول طلب بعده ينتظر
// فحص كامل تاني). مستخدمة في jobs/scheduledCheckJob.js عشان نستفيد من الفحص
// الشامل الدوري (cron) اللي أصلًا بيحصل، فالصفحة الرئيسية تلاقي بيانات طازة
// وجاهزة من غير ما تنتظر فحص تاني بنفس المجهود.
function setLowStockCache(clientId, rows) {
  lowStockCache.set(clientId, { rows, timestamp: Date.now(), refreshing: false });
}

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
    const { pool, config } = await getClientPoolAndConfig(req);
    const item = await itemsRepository.updateReorderQty(pool, Number(req.params.id), Number(reorderQty));
    invalidateLowStockCache(config.id); // الحد اتغير - الكاش القديم بقى غير دقيق
    res.json(item);
  } catch (err) {
    next(err);
  }
}

// كل الأصناف اللي وصلت لحد إعادة الطلب أو أقل في مخزن واحد على الأقل بتاعة العميل
// المسجل دخول حاليًا بس، مجمّعة حسب الصنف (كل صنف مع كل المخازن اللي تحت الحد بتاعته).
// ده اللي بيتعرض في الصفحة الرئيسية أول ما العميل يسجل دخول.
async function getLowStock(req, res, next) {
  try {
    const { pool, config } = await getClientPoolAndConfig(req);
    const rows = await getLowStockRowsCached(config.id, pool);

    const byItem = new Map();
    for (const row of rows) {
      if (!byItem.has(row.itemid)) {
        byItem.set(row.itemid, {
          item: {
            ID: row.itemid,
            Code: row.Code,
            Name_Ar: row.Name_Ar,
            Name_En: row.Name_En,
            ReorderQty: row.ReorderQty,
          },
          branches: [],
        });
      }
      byItem.get(row.itemid).branches.push({ storeid: row.storeid, storename: row.storename, stock: row.transpkgqty1 });
    }

    res.json(Array.from(byItem.values()));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  search,
  getOne,
  updateReorderQty,
  getLowStock,
  getClientPool,
  getClientPoolAndConfig,
  invalidateLowStockCache,
  setLowStockCache,
};
