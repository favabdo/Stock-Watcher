const cron = require('node-cron');
const alertEngineService = require('../services/alertEngineService');

let isRunning = false;

async function runOnce() {
  if (isRunning) return;
  isRunning = true;
  try {
    const results = await alertEngineService.runDigestCycle();
    for (const result of results) {
      if (result.created > 0) {
        console.log(`[Digest] اتعمل ملخص دوري للعميل ${result.clientId}.`);
      }
    }
  } catch (err) {
    console.error('[Digest] فشل دورة الملخص الدوري:', err.message);
  } finally {
    isRunning = false;
  }
}

function start() {
  if (process.env.DIGEST_JOB_ENABLED === 'false') {
    console.log('[Digest] الملخص الدوري متوقف (DIGEST_JOB_ENABLED=false)');
    return;
  }
  const schedule = process.env.DIGEST_JOB_CRON || '*/5 * * * *';
  if (!cron.validate(schedule)) {
    console.error(`[Digest] DIGEST_JOB_CRON غير صحيح: "${schedule}"`);
    return;
  }
  // كل الحسابات الزمنية داخل alertEngineService بتستخدم TimeZone العميل
  // (Africa/Cairo افتراضيًا)، والجدول نفسه كل 5 دقائق.
  cron.schedule(schedule, runOnce);
  console.log(`[Digest] فحص الملخصات شغال بجدول: "${schedule}"`);
}

module.exports = { start, runOnce };
