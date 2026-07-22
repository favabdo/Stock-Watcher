const { sql } = require('../config/db');

// بيشغل wh_ItemStockWatcherNew لصنف معين، وبيرجع صف لكل مخزن (store) الصنف ده
// له فيه رصيد - مش لكل فرع زي القديم. البروسيدر بيحسب liveReorderQty
// (ReorderQty - transpkgqty1) وبيرجع حد إعادة الطلب من نفس الجدول
// (dbo.wh_Items) اللي بيتحدث منه updateReorderQty، فمفيش داعي لأي تغيير تاني
// في مكان تعديل الحد.
//
// isReorder = 1 له معنى خاص جوه البروسيدر نفسه: بيرجع كل الأصناف اللي تعدت حد
// إعادة الطلب دفعة واحدة (مش صنف واحد بس) باللوجيك الصحيح - ده المستخدم في
// الفحص الشامل لكل الأصناف (multiClientCheckService) بدل ما نلف يدويًا على
// كل صنف/فرع. الفحص اليدوي لصنف واحد (stockCheckService) بيسيب isReorder = 0
// (الافتراضي) وبيبعت itemId بس.
async function runItemStockWatcher(pool, {
  isReorder = 0,
  itemId = null,
  storeId = null,
  groupId = null,
  subgroupId = null,
  supplierId = null,
  tDate = null,
  branchId = null,
} = {}) {
  const request = pool.request();
  request.input('isReorder', sql.Int, isReorder);
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

module.exports = { runItemStockWatcher };
