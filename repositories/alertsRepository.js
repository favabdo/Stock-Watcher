const { sql, getPool } = require('../config/db');

// كل الدوال هنا بتشتغل على قاعدة البيانات المركزية بتاعة السيرفر (نفس
// قاعدة StockWatcherUsers_byA)، مش قاعدة بيانات العميل - عشان "الحالات
// المفتوحة" دي معلومة خاصة بالسيرفر نفسه (هل بعت تنبيه عن الحالة دي قبل
// كده ولا لأ)، مش جزء من بيانات العميل.

function keyOf(itemId, storeId) {
  return `${itemId}:${storeId}`;
}

async function getOpenAlertKeys(clientId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  const result = await request.query(`
    SELECT ItemId, StoreId FROM dbo.StockWatcherOpenAlerts_byA WHERE ClientId = @clientId
  `);
  return new Set(result.recordset.map((r) => keyOf(r.ItemId, r.StoreId)));
}

async function insertOpenAlerts(clientId, rows) {
  if (rows.length === 0) return;
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);

  const valuesSql = rows
    .map((r, i) => {
      request.input(`itemId${i}`, sql.BigInt, r.itemid);
      request.input(`storeId${i}`, sql.Int, r.storeid);
      return `(@clientId, @itemId${i}, @storeId${i}, GETDATE())`;
    })
    .join(', ');

  await request.query(`
    INSERT INTO dbo.StockWatcherOpenAlerts_byA (ClientId, ItemId, StoreId, FirstNotifiedAt)
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
      request.input(`itemId${i}`, sql.BigInt, k.itemid);
      request.input(`storeId${i}`, sql.Int, k.storeid);
      return `(ItemId = @itemId${i} AND StoreId = @storeId${i})`;
    })
    .join(' OR ');

  await request.query(`
    DELETE FROM dbo.StockWatcherOpenAlerts_byA WHERE ClientId = @clientId AND (${conditions})
  `);
}

// بيقارن الحالات الحالية (currentRows فيها itemid و storeid، زي اللي راجعة
// من multiClientCheckService) مع الحالات المفتوحة المحفوظة من فحص سابق:
//   - newAlerts   -> حالات جديدة (صنف/مخزن) لسه ما اتبعتش تنبيه عنها -> دي
//                    اللي المفروض يتبعت تنبيه واتساب عنها فورًا.
//   - resolvedCount -> حالات كانت مفتوحة قبل كده ورجعت فوق حد إعادة الطلب
//                    (اتحلت) -> بتتمسح من الجدول عشان لو الصنف رجع نقص تاني
//                    في المستقبل يتبعت عنه تنبيه جديد من الأول.
async function syncAlerts(clientId, currentRows) {
  const openKeys = await getOpenAlertKeys(clientId);
  const currentKeysSet = new Set(currentRows.map((r) => keyOf(r.itemid, r.storeid)));

  const newAlerts = currentRows.filter((r) => !openKeys.has(keyOf(r.itemid, r.storeid)));
  const resolvedKeys = [...openKeys]
    .filter((k) => !currentKeysSet.has(k))
    .map((k) => {
      const [itemid, storeid] = k.split(':');
      return { itemid: Number(itemid), storeid: Number(storeid) };
    });

  await Promise.all([
    insertOpenAlerts(clientId, newAlerts),
    deleteResolvedAlerts(clientId, resolvedKeys),
  ]);

  return { newAlerts, resolvedCount: resolvedKeys.length };
}

module.exports = { syncAlerts };
