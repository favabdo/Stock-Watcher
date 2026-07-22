const cron = require('node-cron');
const clientsRepository = require('../repositories/clientsRepository');
const multiClientCheckService = require('../services/multiClientCheckService');

// التشغيل التلقائي بيتفعل بـ:
//   ENABLE_CRON=true
//   CRON_SCHEDULE="0 * * * *"   (اختياري - افتراضي كل ساعة، صيغة cron عادية)

function start() {
  if (process.env.ENABLE_CRON !== 'true') {
    console.log('[Cron] الفحص التلقائي المجدول متوقف (ENABLE_CRON مش = true)');
    return;
  }

  const schedule = process.env.CRON_SCHEDULE || '0 * * * *';
  if (!cron.validate(schedule)) {
    console.error(`[Cron] CRON_SCHEDULE غير صحيح: "${schedule}" - الفحص التلقائي مش هيشتغل`);
    return;
  }

  cron.schedule(schedule, runAllClientsCheck);
  console.log(`[Cron] الفحص التلقائي شغال بجدول: "${schedule}"`);
}

async function runAllClientsCheck() {
  console.log('[Cron] بدء فحص كل العملاء...');
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
      const result = await multiClientCheckService.runCheckForClient(fullConfig);
      console.log(`[Cron] "${result.clientName}": ${result.belowThresholdCount} حالة تحت حد إعادة الطلب`);
    } catch (err) {
      console.error(`[Cron] فشل فحص العميل "${client.clientName}":`, err.message);
    }
  }
  console.log('[Cron] انتهى فحص كل العملاء.');
}

module.exports = { start, runAllClientsCheck };
