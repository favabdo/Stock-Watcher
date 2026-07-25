const clientPoolManager = require('./clientPoolManager');
const stockRepository = require('../repositories/stockRepository');
const whatsappService = require('./whatsappService');
const alertsRepository = require('../repositories/alertsRepository');

const MAX_LINES_IN_MESSAGE = 30;

function buildWhatsappMessage(clientName, belowThreshold, { onlyNew = false } = {}) {
  const parts = [];
  parts.push(`تنبيه Stock Watcher - ${clientName}.`);
  parts.push(
    onlyNew
      ? `فيه ${belowThreshold.length} صنف جديد وصل لحد إعادة الطلب أو أقل منه:`
      : `فيه ${belowThreshold.length} حالة وصلت لحد إعادة الطلب أو أقل منه:`
  );

  belowThreshold.slice(0, MAX_LINES_IN_MESSAGE).forEach((row, i) => {
    const name = row.Name_Ar || row.Name_En || row.Code;
    parts.push(`${i + 1}) ${row.Code} - ${name} - ${row.storename}: الاستوك ${row.transpkgqty1} (الحد ${row.ReorderQty}).`);
  });

  if (belowThreshold.length > MAX_LINES_IN_MESSAGE) {
    parts.push(`و ${belowThreshold.length - MAX_LINES_IN_MESSAGE} حالة تانية.`);
  }

  return parts.join(' ');
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

// بيشغل الفحص الكامل لعميل معين.
//
// options.onlyNewAlerts:
//   - false (افتراضي، ده اللي بيستخدمه زرار "تحقق الآن" اليدوي في صفحة
//     الإعدادات) -> بيبعت رسالة واحدة مجمعة فيها كل الحالات تحت الحد، زي ما
//     كان بالظبط، لأن ده فحص يدوي مقصود من الأدمن عايز يشوف الصورة كاملة.
//   - true (ده اللي بيستخدمه الفحص التلقائي المجدول scheduledCheckJob) ->
//     بيقارن مع الحالات "المفتوحة" المحفوظة من آخر فحص (alertsRepository)
//     وبيبعت تنبيه بس عن الأصناف الجديدة اللي لسه ما اتبعتش عنها تنبيه، عشان
//     التنبيه يوصل فورًا أول ما الصنف يظهر من غير ما يتكرر نفس التنبيه في كل
//     فحص طول ما الصنف لسه تحت الحد.
async function runCheckForClient(clientConnectionConfig, { onlyNewAlerts = false } = {}) {
  const pool = await clientPoolManager.getPoolForClient(clientConnectionConfig);
  const belowThreshold = await checkAllItemsAcrossBranches(pool);

  let itemsToNotify = belowThreshold;
  let newAlertsCount = null;

  if (onlyNewAlerts) {
    const { newAlerts, resolvedCount } = await alertsRepository.syncAlerts(
      clientConnectionConfig.id,
      belowThreshold
    );
    itemsToNotify = newAlerts;
    newAlertsCount = newAlerts.length;
    if (resolvedCount > 0) {
      console.log(
        `[MultiCheck] العميل "${clientConnectionConfig.clientName}": ${resolvedCount} حالة رجعت فوق حد إعادة الطلب.`
      );
    }
  }

  let whatsappResult = null;
  if (itemsToNotify.length > 0) {
    const message = buildWhatsappMessage(clientConnectionConfig.clientName, itemsToNotify, {
      onlyNew: onlyNewAlerts,
    });
    try {
      whatsappResult = await whatsappService.sendWhatsappMessageToMany(
        clientConnectionConfig.whatsappPhone,
        message
      );
      console.log(
        `[MultiCheck] اتبعتت رسالة واتساب للعميل "${clientConnectionConfig.clientName}" ` +
        `(${itemsToNotify.length} ${onlyNewAlerts ? 'حالة جديدة' : 'حالة'})`
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
    newAlertsCount,
    whatsapp: whatsappResult,
  };
}

module.exports = { checkAllItemsAcrossBranches, runCheckForClient };
