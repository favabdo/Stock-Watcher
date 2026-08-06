const { sql, getPool } = require('../config/db');

// نفس فكرة repositories/alertsRepository.js بالظبط، بس لتنبيهات تجاوز الحد
// الائتماني بدل نقص الاستوك - المفتاح هنا (customerId + branchId) بدل
// (itemId + storeId). بتشتغل على قاعدة البيانات المركزية بتاعة السيرفر، مش
// قاعدة بيانات العميل.

function keyOf(customerId, branchId) {
  return `${customerId}:${branchId ?? 0}`;
}

async function getOpenAlertKeys(clientId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  const result = await request.query(`
    SELECT CustomerId, BranchId FROM dbo.StockWatcherOpenCreditAlerts_byA WHERE ClientId = @clientId
  `);
  return new Set(result.recordset.map((r) => keyOf(r.CustomerId, r.BranchId)));
}

async function insertOpenAlerts(clientId, rows) {
  if (rows.length === 0) return;
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);

  const valuesSql = rows
    .map((r, i) => {
      request.input(`customerId${i}`, sql.BigInt, r.customerId);
      request.input(`branchId${i}`, sql.Int, r.branchId ?? 0);
      return `(@clientId, @customerId${i}, @branchId${i}, GETDATE())`;
    })
    .join(', ');

  await request.query(`
    INSERT INTO dbo.StockWatcherOpenCreditAlerts_byA (ClientId, CustomerId, BranchId, FirstNotifiedAt)
    VALUES ${valuesSql}
  `);
}

async function deleteResolvedAlerts(clientId, keys) {
  if (keys.length === 0) return;
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);

  const conditions = keys
    .map((k, i) => {
      request.input(`customerId${i}`, sql.BigInt, k.customerId);
      request.input(`branchId${i}`, sql.Int, k.branchId ?? 0);
      return `(CustomerId = @customerId${i} AND BranchId = @branchId${i})`;
    })
    .join(' OR ');

  await request.query(`
    DELETE FROM dbo.StockWatcherOpenCreditAlerts_byA WHERE ClientId = @clientId AND (${conditions})
  `);
}

// نفس منطق alertsRepository.syncAlerts: بيقارن الحالات الحالية (currentRows
// فيها customerId و branchId) مع الحالات المفتوحة المحفوظة من فحص سابق.
async function syncAlerts(clientId, currentRows) {
  const openKeys = await getOpenAlertKeys(clientId);
  const currentKeysSet = new Set(currentRows.map((r) => keyOf(r.customerId, r.branchId)));

  const newAlerts = currentRows.filter((r) => !openKeys.has(keyOf(r.customerId, r.branchId)));
  const resolvedKeys = [...openKeys]
    .filter((k) => !currentKeysSet.has(k))
    .map((k) => {
      const [customerId, branchId] = k.split(':');
      return { customerId: Number(customerId), branchId: Number(branchId) };
    });

  await Promise.all([
    insertOpenAlerts(clientId, newAlerts),
    deleteResolvedAlerts(clientId, resolvedKeys),
  ]);

  return { newAlerts, resolvedCount: resolvedKeys.length };
}

module.exports = { syncAlerts };
