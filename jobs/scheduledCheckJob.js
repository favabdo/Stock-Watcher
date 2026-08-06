const cron = require('node-cron');
const clientsRepository = require('../repositories/clientsRepository');
const multiClientCheckService = require('../services/multiClientCheckService');
const creditLimitCheckService = require('../services/creditLimitCheckService');

// التشغيل التلقائي بيتفعل بـ:
//   ENABLE_CRON=true
//   CRON_SCHEDULE="*/10 * * * * *"   (صيغة cron بست حقول: ثانية دقيقة ساعة
//                                     يوم شهر يوم_أسبوع - المثال ده كل 10
//                                     ثواني. الصيغة العادية بخمس حقول زي
//                                     "* * * * *" لسه شغالة برضه لو عايز
//                                     دقة الدقيقة بس)
//
// ده الميكانيزم اللي بيخلي التنبيه يوصل "فورًا" من غير ما حد يفتح الموقع أو
// يدوس على الصنف: السيرفر بيفحص كل العملاء كل ما الجدول يستحق (كل 10 ثواني
// افتراضيًا) لوحده - تمامًا زي لو الصفحة الرئيسية بتعمل نفسها ريفريش أوتوماتيك
// كل شوية، بس من غير أي متصفح مفتوح خالص. لو لقى صنف جديد وصل لحد إعادة
// الطلب (مش كان معروف من قبل) بيبعت تنبيه واتساب على طول عن الصنف ده بس (مش
// بيكرر نفس التنبيه في كل مرة طول ما الصنف لسه تحت الحد - شوف
// alertsRepository.syncAlerts).
//
// ده حل جذري وكافي لوحده على سيرفر دايمًا شغال (زي سيرفر شركة on-prem أو أي
// VPS/سيرفر مدفوع): البروسيس بيفضل شغال 24/7 فالجدولة الداخلية دي بتشتغل
// أوتوماتيك من غير أي حاجة إضافية (زي بينج خارجي أو استضافة مجانية بتنيّم
// السيرفر). المهم بس تتأكد إن حد بيشغّل السيرفر نفسه بشكل دائم (PM2 أو
// Windows Service) - شوف ملحوظة التشغيل الدائم في README.md.
let isRunning = false;

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
  // Guard بسيط عشان لو نداءين اشتغلوا في نفس الوقت (الجدولة الداخلية + بينج
  // خارجي مثلاً) ميحصلش فحص مزدوج للعميل نفسه في نفس اللحظة (ده كان ممكن
  // يسبب نظريًا تنبيه مكرر لو الاتنين مسكوا نفس الصنف في لحظة التحول).
  if (isRunning) {
    console.log('[Cron] فيه فحص شغال بالفعل - هيتم تجاهل النداء ده.');
    return;
  }
  isRunning = true;

  try {
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

        // كل عميل بيتفحص بحسب نوع التنبيهات المفعّلة له (alertStockEnabled /
        // alertCreditLimitEnabled) - ممكن يكون مفعّل واحد بس أو الاتنين مع
        // بعض. onlyNewAlerts: true في الحالتين -> يبعت تنبيه بس عن الحالات
        // الجديدة اللي ظهرت من آخر فحص، مش عن كل الحالات المفتوحة في كل مرة.
        if (fullConfig.alertStockEnabled) {
          try {
            const result = await multiClientCheckService.runCheckForClient(fullConfig, { onlyNewAlerts: true });
            if (result.newAlertsCount > 0) {
              console.log(
                `[Cron] "${result.clientName}": ${result.newAlertsCount} صنف جديد وصل لحد إعادة الطلب (من إجمالي ${result.belowThresholdCount} حالة حاليًا).`
              );
            }
          } catch (err) {
            console.error(`[Cron] فشل فحص الاستوك للعميل "${client.clientName}":`, err.message);
          }
        }

        if (fullConfig.alertCreditLimitEnabled) {
          try {
            const result = await creditLimitCheckService.runCreditCheckForClient(fullConfig, { onlyNewAlerts: true });
            if (result.newAlertsCount > 0) {
              console.log(
                `[Cron] "${result.clientName}": ${result.newAlertsCount} حالة جديدة تجاوزت الحد الائتماني (من إجمالي ${result.overLimitCount} حالة حاليًا).`
              );
            }
          } catch (err) {
            console.error(`[Cron] فشل فحص الحد الائتماني للعميل "${client.clientName}":`, err.message);
          }
        }
      } catch (err) {
        console.error(`[Cron] فشل تحميل إعدادات العميل "${client.clientName}":`, err.message);
      }
    }
  } finally {
    isRunning = false;
  }
}

module.exports = { start, runAllClientsCheck };
