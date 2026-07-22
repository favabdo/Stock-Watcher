const branchRepository = require('../repositories/branchRepository');
const stockRepository = require('../repositories/stockRepository');
const itemsRepository = require('../repositories/itemsRepository');

// بيتشيك على صنف معين في كل الفروع، ولو لقى فرع تحت حد ReorderQty بيطبع
// "أكشن" في التيرمينل مؤقتًا (مكان الإشعار الحقيقي لسه هيتحدد بعدين).
async function checkItemAcrossBranches(itemId) {
  const item = await itemsRepository.getItemById(itemId);
  if (!item) {
    throw Object.assign(new Error('الصنف غير موجود'), { status: 404 });
  }

  const branchIds = await branchRepository.getAllBranchIds();
  const belowThreshold = [];

  for (const branchID of branchIds) {
    let rows;
    try {
      rows = await stockRepository.runFollowRequestEnd({ itemNO: item.ID, branchID });
    } catch (err) {
      console.error(`[StockCheck] فرع ${branchID} - خطأ في تشغيل wh_FollowRequestEnd:`, err.message);
      continue;
    }

    const match = rows.find((r) => String(r.itemid) === String(item.ID));
    if (match) {
      belowThreshold.push({ branchID, row: match });
      console.log(
        `[ACTION][ReorderAlert] الصنف ${item.Code} (${item.Name_Ar || item.Name_En}) ` +
        `- فرع ${branchID}: الاستوك الحالي=${match.Stock} <= حد إعادة الطلب=${item.ReorderQty}. ` +
        `-> هنا هيتبعت الإشعار لاحقًا.`
      );
    }
  }

  if (belowThreshold.length === 0) {
    console.log(`[StockCheck] الصنف ${item.Code}: مفيش أي فرع تحت حد إعادة الطلب (${item.ReorderQty}).`);
  }

  return { item, checkedBranches: branchIds, belowThreshold };
}

module.exports = { checkItemAcrossBranches };
