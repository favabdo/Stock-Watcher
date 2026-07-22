const clientPoolManager = require('./clientPoolManager');
const stockRepository = require('../repositories/stockRepository');
const whatsappService = require('./whatsappService');

const MAX_LINES_IN_MESSAGE = 30;

function buildWhatsappMessage(clientName, belowThreshold) {
  const lines = [];
  lines.push(`⚠️ تنبيه Stock Watcher - ${clientName}`);
  lines.push(`فيه ${belowThreshold.length} حالة وصلت لحد إعادة الطلب أو أقل منه:`);
  lines.push('');

  belowThreshold.slice(0, MAX_LINES_IN_MESSAGE).forEach((row, i) => {
    const name = row.Name_Ar || row.Name_En || row.Code;
    lines.push(`${i + 1}) ${row.Code} - ${name} | ${row.storename}: الاستوك ${row.transpkgqty1} (الحد ${row.ReorderQty})`);
  });

  if (belowThreshold.length > MAX_LINES_IN_MESSAGE) {
    lines.push(`... و ${belowThreshold.length - MAX_LINES_IN_MESSAGE} حالة تانية`);
  }

  return lines.join('\n');
}

// بيفحص كل الأصناف اللي وصلت لحد إعادة الطلب أو أقل في أي مخزن، عن طريق نداء
// واحد بس لـ wh_ItemStockWatcherNew بباراميتر isReorder = 1 - القيمة دي معمولة
// في البروسيدر نفسه عشان ترجع كل الأصناف اللي تعدت حد إعادة الطلب دفعة واحدة
// باللوجيك الصحيح، بدل ما نلف يدويًا (صنف × فرع) زي الأسلوب القديم.
//
// نفس معيار "تحت الحد" المستخدم في الفحص اليدوي لصنف واحد (stockCheckService):
// liveReorderQty >= 0  -> الصنف وصل لحد إعادة الطلب أو تجاوزه (لازم تنبيه)
// liveReorderQty < 0   -> الرصيد لسه فوق الحد، مفيش مشكلة
async function checkAllItemsAcrossBranches(pool) {
  const rows = await stockRepository.runItemStockWatcher(pool, { isReorder: 1 });

  return rows
    .filter((r) => Number(r.liveReorderQty) >= 0)
    .map((r) => ({
      itemid: r.itemid,
      Code: r.itemcode,
      Name_Ar: r.itemname,
      Name_En: r.itemname,
      ReorderQty: r.ReorderQty,
      storeid: r.storeid,
      storename: r.storename,
      transpkgqty1: r.transpkgqty1,
      liveReorderQty: r.liveReorderQty,
    }));
}

// بيشغل الفحص الكامل لعميل معين، ولو فيه أي حالة تحت الحد بيبعت رسالة واتساب
// واحدة مجمعة لرقم العميل المتظبط في إعداداته.
async function runCheckForClient(clientConnectionConfig) {
  const pool = await clientPoolManager.getPoolForClient(clientConnectionConfig);
  const belowThreshold = await checkAllItemsAcrossBranches(pool);

  let whatsappResult = null;
  if (belowThreshold.length > 0) {
    const message = buildWhatsappMessage(clientConnectionConfig.clientName, belowThreshold);
    try {
      await whatsappService.sendWhatsappMessage(clientConnectionConfig.whatsappPhone, message);
      whatsappResult = { sent: true };
      console.log(
        `[MultiCheck] اتبعتت رسالة واتساب للعميل "${clientConnectionConfig.clientName}" (${belowThreshold.length} حالة)`
      );
    } catch (err) {
      whatsappResult = { sent: false, error: err.message };
      console.error(`[MultiCheck] فشل إرسال واتساب للعميل "${clientConnectionConfig.clientName}":`, err.message);
    }
  }

  return {
    clientId: clientConnectionConfig.id,
    clientName: clientConnectionConfig.clientName,
    belowThresholdCount: belowThreshold.length,
    belowThreshold,
    whatsapp: whatsappResult,
  };
}

module.exports = { checkAllItemsAcrossBranches, runCheckForClient };
