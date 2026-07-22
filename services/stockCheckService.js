const stockRepository = require('../repositories/stockRepository');
const itemsRepository = require('../repositories/itemsRepository');
const whatsappService = require('./whatsappService');

const MAX_LINES_IN_MESSAGE = 30;

// نفس أسلوب رسالة الواتساب المستخدمة في الفحص الشامل (multiClientCheckService)
// بس مخصصة لصنف واحد مع كل المخازن اللي وصل فيها لحد إعادة الطلب أو أقل.
function buildWhatsappMessage(clientName, item, belowThreshold) {
  const itemName = item.Name_Ar || item.Name_En || item.Code;
  const lines = [];
  lines.push(`⚠️ تنبيه Stock Watcher - ${clientName}`);
  lines.push(`الصنف ${item.Code} - ${itemName} وصل لحد إعادة الطلب أو أقل في ${belowThreshold.length} مخزن:`);
  lines.push('');

  belowThreshold.slice(0, MAX_LINES_IN_MESSAGE).forEach((s, i) => {
    lines.push(`${i + 1}) ${s.storename}: الاستوك ${s.transpkgqty1} (الحد ${s.reorderQty})`);
  });

  if (belowThreshold.length > MAX_LINES_IN_MESSAGE) {
    lines.push(`... و ${belowThreshold.length - MAX_LINES_IN_MESSAGE} مخزن تاني`);
  }

  return lines.join('\n');
}

// بيتشيك على صنف معين في كل المخازن (مش الفروع) عن طريق البروسيدر
// wh_ItemStockWatcherNew، اللي بيرجع صف لكل مخزن فيه رصيد للصنف ده مع
// liveReorderQty = ReorderQty - transpkgqty1.
// liveReorderQty >= 0  -> الصنف وصل لحد إعادة الطلب أو تجاوزه (لازم تنبيه)
// liveReorderQty < 0   -> الرصيد لسه فوق الحد، مفيش مشكلة
//
// clientInfo (اختياري): { clientName, whatsappPhone } - لو موجود وفيه مخازن
// تحت الحد، بتتبعت رسالة واتساب حقيقية زي بالظبط اللي بيبعتها الفحص التلقائي
// في الصفحة الرئيسية (مش مجرد طباعة في الكونسول زي قبل كده).
async function checkItemAcrossStores(pool, itemId, clientInfo = null) {
  const item = await itemsRepository.getItemById(pool, itemId);
  if (!item) {
    throw Object.assign(new Error('الصنف غير موجود'), { status: 404 });
  }

  let rows;
  try {
    rows = await stockRepository.runItemStockWatcher(pool, { itemId: item.ID });
  } catch (err) {
    console.error(`[StockCheck] خطأ في تشغيل wh_ItemStockWatcherNew للصنف ${item.Code}:`, err.message);
    throw Object.assign(new Error('حصل خطأ أثناء جلب بيانات الاستوك'), { status: 500 });
  }

  const stores = rows.map((r) => ({
    storeid: r.storeid,
    storename: r.storename,
    transpkgqty1: r.transpkgqty1,
    reorderQty: r.ReorderQty,
    liveReorderQty: r.liveReorderQty,
    belowThreshold: Number(r.liveReorderQty) >= 0,
  }));

  const belowThreshold = stores.filter((s) => s.belowThreshold);

  let whatsappResult = null;
  if (belowThreshold.length > 0) {
    console.log(
      `[ACTION][ReorderAlert] الصنف ${item.Code} (${item.Name_Ar || item.Name_En}) ` +
      `وصل لحد إعادة الطلب أو أقل في ${belowThreshold.length} مخزن.`
    );

    if (clientInfo && clientInfo.whatsappPhone) {
      const message = buildWhatsappMessage(clientInfo.clientName, item, belowThreshold);
      try {
        await whatsappService.sendWhatsappMessage(clientInfo.whatsappPhone, message);
        whatsappResult = { sent: true };
        console.log(`[StockCheck] اتبعتت رسالة واتساب تنبيه للصنف ${item.Code}`);
      } catch (err) {
        whatsappResult = { sent: false, error: err.message };
        console.error(`[StockCheck] فشل إرسال واتساب للصنف ${item.Code}:`, err.message);
      }
    }
  } else {
    console.log(`[StockCheck] الصنف ${item.Code}: مفيش أي مخزن تحت حد إعادة الطلب (${item.ReorderQty}).`);
  }

  return {
    item,
    itemid: item.ID,
    itemcode: item.Code,
    stores,
    belowThreshold,
    whatsapp: whatsappResult,
  };
}

module.exports = { checkItemAcrossStores };
