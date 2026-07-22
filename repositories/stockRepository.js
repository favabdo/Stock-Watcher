const { sql } = require('../config/db');

// @TDate بيتخزن بصيغة YYYYMMDD كرقم (مثلاً 20260722)
function todayAsYYYYMMDD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return Number(`${y}${m}${d}`);
}

// بيشغل wh_FollowRequestEnd لصنف معين وفرع معين.
// ملحوظة: البروسيدر نفسه بيفلتر داخليًا (ReorderQty<>0 and stock<=ReorderQty)
// يعني أي صف يرجع فعلاً معناه الصنف تحت الحد المسموح في الفرع ده.
async function runFollowRequestEnd(pool, {
  itemNO,
  branchID,
  storeId = 0, // 0 = كل المخازن (زي ما موضح جوه البروسيدر نفسه)
  groupId = null,
  supGroupId = null,
  supplierId = null,
  tDate = null,
}) {
  const request = pool.request();
  request.input('StoreId', sql.Int, storeId);
  request.input('itemNO', sql.Int, itemNO);
  request.input('GroupId', sql.Int, groupId);
  request.input('supgroupid', sql.Int, supGroupId);
  request.input('SupplierId', sql.Int, supplierId);
  request.input('TDate', sql.BigInt, tDate ?? todayAsYYYYMMDD());
  request.input('BranchID', sql.Int, branchID);

  const result = await request.execute('dbo.wh_FollowRequestEnd');
  return result.recordset || [];
}

// بيشغل wh_ItemStockWatcherNew لصنف معين، وبيرجع صف لكل مخزن (store) الصنف ده
// له فيه رصيد - مش لكل فرع زي القديم. البروسيدر بيحسب liveReorderQty
// (ReorderQty - transpkgqty1) وبيرجع حد إعادة الطلب من نفس الجدول
// (dbo.wh_Items) اللي بيتحدث منه updateReorderQty، فمفيش داعي لأي تغيير تاني
// في مكان تعديل الحد.
async function runItemStockWatcher(pool, {
  itemId = null,
  storeId = null,
  groupId = null,
  subgroupId = null,
  supplierId = null,
  tDate = null,
  branchId = null,
} = {}) {
  const request = pool.request();
  request.input('itemid', sql.BigInt, itemId);
  request.input('storeid', sql.Int, storeId);
  request.input('groupid', sql.Int, groupId);
  request.input('subgroupid', sql.Int, subgroupId);
  request.input('supplierid', sql.Int, supplierId);
  request.input('tdate', sql.Int, tDate);
  request.input('branchid', sql.Int, branchId);

  const result = await request.execute('dbo.wh_ItemStockWatcherNew');
  return result.recordset || [];
}

module.exports = { runFollowRequestEnd, runItemStockWatcher, todayAsYYYYMMDD };
