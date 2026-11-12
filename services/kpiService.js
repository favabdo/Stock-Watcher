const multiClientCheckService = require('./multiClientCheckService');
const creditLimitCheckService = require('./creditLimitCheckService');

// KPIs الصفحة الرئيسية. الفحص الكامل (isReorder=1) تقيل على ERP، فبنكاش
// النتيجة 15 ثانية لكل عميل - كفاية لتحديث الشاشة بدون سبام.
const TTL_MS = Number(process.env.KPI_CACHE_TTL_MS) || 15000;
const cache = new Map();

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function getKpis(clientId, pool, settings) {
  const cached = cache.get(clientId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const rows = await multiClientCheckService.checkAllItemsAcrossBranches(pool);
  const low = new Set();
  const zero = new Set();
  for (const row of rows) {
    const stock = num(row.transpkgqty1);
    if (stock <= 0) zero.add(row.itemid);
    else low.add(row.itemid);
  }

  let overLimitCustomers = 0;
  if (settings && (settings.creditOverEnabled || settings.creditIncreaseEnabled)) {
    const creditRows = await creditLimitCheckService.checkAllCustomersOverCreditLimit(pool);
    overLimitCustomers = new Set(creditRows.map((r) => r.customerId)).size;
  }

  const data = {
    lowStockItems: low.size,
    zeroStockItems: zero.size,
    overLimitCustomers,
  };
  cache.set(clientId, { expiresAt: Date.now() + TTL_MS, data });
  return data;
}

function invalidate(clientId) {
  if (clientId === undefined) cache.clear();
  else cache.delete(clientId);
}

module.exports = { getKpis, invalidate };
