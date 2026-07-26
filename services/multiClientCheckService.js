const clientPoolManager = require('./clientPoolManager');
const stockRepository = require('../repositories/stockRepository');
const whatsappService = require('./whatsappService');
const alertsRepository = require('../repositories/alertsRepository');

const MAX_LINES_IN_MESSAGE = 30;

// بيبني رسالة مجمعة (كل الحالات مع بعضها في رسالة واحدة) - مستخدمة بس في
// الفحص اليدوي الكامل (زرار "تحقق الآن" في صفحة الإعدادات، onlyNewAlerts:
// false) لأن ده فحص مقصود من الأدمن عايز يشوف الصورة كاملة دفعة واحدة.
function buildSummaryMessage(clientName, belowThreshold) {
  const parts = [];
  parts.push(`تنبيه Stock Watcher - ${clientName}.`);
  parts.push(`فيه ${belowThreshold.length} حالة وصلت لحد إعادة الطلب أو أقل منه:`);

  belowThreshold.slice(0, MAX_LINES_IN_MESSAGE).forEach((row, i) => {
    const name = row.Name_Ar || row.Name_En || row.Code;
    parts.push(`${i + 1}) ${row.Code} - ${name} - ${row.storename}: الاستوك ${row.transpkgqty1} (الحد ${row.ReorderQty}).`);
  });

  if (belowThreshold.length > MAX_LINES_IN_MESSAGE) {
    parts.push(`و ${belowThreshold.length - MAX_LINES_IN_MESSAGE} حالة تانية.`);
  }

  return parts.join(' ');
}

// بيبني رسالة لصنف واحد بس، مع كل المخازن اللي وصل فيها لحد إعادة الطلب -
// دي اللي بتتبعت في الفحص التلقائي المجدول (onlyNewAlerts: true) لكل صنف
// جديد لوحده، منفصلة تمامًا عن أي صنف تاني ظهر في نفس دورة الفحص.
function buildSingleItemMessage(clientName, itemGroup) {
  const name = itemGroup.Name_Ar || itemGroup.Name_En || itemGroup.Code;
  const parts = [];
  parts.push(`تنبيه Stock Watcher - ${clientName}.`);
  parts.push(`الصنف ${itemGroup.Code} - ${name} وصل لحد إعادة الطلب أو أقل في ${itemGroup.stores.length} مخزن:`);

  itemGroup.stores.slice(0, MAX_LINES_IN_MESSAGE).forEach((s, i) => {
    parts.push(`${i + 1}) ${s.storename}: الاستوك ${s.transpkgqty1} (الحد ${s.ReorderQty}).`);
  });

  if (itemGroup.stores.length > MAX_LINES_IN_MESSAGE) {
    parts.push(`و ${itemGroup.stores.length - MAX_LINES_IN_MESSAGE} مخزن تاني.`);
  }

  return parts.join(' ');
}

// بيجمع صفوف (صنف × مخزن) المسطحة لمجموعات لكل صنف لوحده - عشان كل صنف
// ياخد رسالة واتساب منفصلة بدل ما كل الأصناف الجديدة تتلم في رسالة واحدة.
function groupRowsByItem(rows) {
  const byItem = new Map();
  for (const row of rows) {
    if (!byItem.has(row.itemid)) {
      byItem.set(row.itemid, {
        itemid: row.itemid,
        Code: row.Code,
        Name_Ar: row.Name_Ar,
        Name_En: row.Name_En,
        stores: [],
      });
    }
    byItem.get(row.itemid).stores.push(row);
  }
  return [...byItem.values()];
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

  const whatsappResults = [];

  if (itemsToNotify.length > 0) {
    if (onlyNewAlerts) {
      // كل صنف جديد ياخد رسالة واتساب منفصلة بتاعته بس، حتى لو أكتر من صنف
      // ظهر في نفس دورة الفحص - مش رسالة واحدة مجمعة فيها كل الأصناف.
      const itemGroups = groupRowsByItem(itemsToNotify);
      for (const itemGroup of itemGroups) {
        const message = buildSingleItemMessage(clientConnectionConfig.clientName, itemGroup);
        try {
          const result = await whatsappService.sendWhatsappMessageToMany(
            clientConnectionConfig.whatsappPhones,
            message
          );
          whatsappResults.push({ itemid: itemGroup.itemid, code: itemGroup.Code, ...result });
          console.log(
            `[MultiCheck] اتبعتت رسالة واتساب منفصلة للصنف "${itemGroup.Code}" للعميل "${clientConnectionConfig.clientName}" (${itemGroup.stores.length} مخزن).`
          );
        } catch (err) {
          whatsappResults.push({ itemid: itemGroup.itemid, code: itemGroup.Code, sent: false, error: err.message });
          console.error(
            `[MultiCheck] فشل إرسال واتساب للصنف "${itemGroup.Code}" للعميل "${clientConnectionConfig.clientName}":`,
            err.message
          );
        }
      }
    } else {
      // الفحص اليدوي الكامل - رسالة واحدة مجمعة زي ما كان.
      const message = buildSummaryMessage(clientConnectionConfig.clientName, itemsToNotify);
      try {
        const result = await whatsappService.sendWhatsappMessageToMany(
          clientConnectionConfig.whatsappPhones,
          message
        );
        whatsappResults.push(result);
        console.log(
          `[MultiCheck] اتبعتت رسالة واتساب مجمعة للعميل "${clientConnectionConfig.clientName}" (${itemsToNotify.length} حالة)`
        );
      } catch (err) {
        whatsappResults.push({ sent: false, error: err.message });
        console.error(`[MultiCheck] فشل إرسال واتساب للعميل "${clientConnectionConfig.clientName}":`, err.message);
      }
    }
  }

  return {
    clientId: clientConnectionConfig.id,
    clientName: clientConnectionConfig.clientName,
    belowThresholdCount: belowThreshold.length,
    belowThreshold,
    newAlertsCount,
    whatsapp: whatsappResults,
  };
}

module.exports = { checkAllItemsAcrossBranches, runCheckForClient };
