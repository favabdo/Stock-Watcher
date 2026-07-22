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

module.exports = { runFollowRequestEnd, todayAsYYYYMMDD };
