const cron = require('node-cron');
const clientsRepository = require('../repositories/clientsRepository');
const multiClientCheckService = require('../services/multiClientCheckService');

// التشغيل التلقائي بيتفعل بـ:
//   ENABLE_CRON=true
//   CRON_SCHEDULE="* * * * *"   (اختياري - افتراضي كل دقيقة، صيغة cron عادية)
//
// ده الميكانيزم اللي بيخلي التنبيه يوصل "فورًا" من غير ما حد يفتح الموقع أو
// يدوس على الصنف: السيرفر بيفحص كل العملاء كل دقيقة لوحده، ولو لقى صنف جديد
// وصل لحد إعادة الطلب (مش كان معروف من قبل) بيبعت تنبيه واتساب على طول عن
// الصنف ده بس (مش بيكرر نفس التنبيه في كل مرة طول ما الصنف لسه تحت الحد -
// شوف alertsRepository.syncAlerts).
function start() {
  if (process.env.ENABLE_CRON !== 'true') {
    console.log('[Cron] الفحص التلقائي المجدول متوقف (ENABLE_CRON مش = true)');
    return;
  }

  const schedule = process.env.CRON_SCHEDULE || '* * * * *';
  if (!cron.validate(schedule)) {
    console.error(`[Cron] CRON_SCHEDULE غير صحيح: "${schedule}" - الفحص التلقائي مش هيشتغل`);
    return;
  }

  cron.schedule(schedule, runAllClientsCheck);
  console.log(`[Cron] الفحص التلقائي شغال بجدول: "${schedule}"`);
}

async function runAllClientsCheck() {
  let clients;
  try {
    clients = await clientsRepository.getActiveClients();
  } catch (err) {
    console.error('[Cron] فشل تحميل قائمة العملاء:', err.message);
    return;
  }

  for (const client of clients) {
    try {
      const fullConfig = await clientsRepository.getClientConnectionConfig(client.id);
      // onlyNewAlerts: true -> يبعت تنبيه بس عن الأصناف الجديدة اللي ظهرت
      // من آخر فحص، مش عن كل الأصناف تحت الحد في كل مرة.
      const result = await multiClientCheckService.runCheckForClient(fullConfig, { onlyNewAlerts: true });
      if (result.newAlertsCount > 0) {
        console.log(
          `[Cron] "${result.clientName}": ${result.newAlertsCount} صنف جديد وصل لحد إعادة الطلب (من إجمالي ${result.belowThresholdCount} حالة حاليًا).`
        );
      }
    } catch (err) {
      console.error(`[Cron] فشل فحص العميل "${client.clientName}":`, err.message);
    }
  }
}

module.exports = { start, runAllClientsCheck };
