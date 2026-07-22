const clientsRepository = require('../repositories/clientsRepository');
const clientPoolManager = require('../services/clientPoolManager');
const multiClientCheckService = require('../services/multiClientCheckService');
const { setLowStockCache } = require('../controllers/itemsController');
const { mapWithConcurrency } = require('../utils/concurrency');

// أقصى عدد عملاء بيتسخّنوا في نفس الوقت وقت تشغيل السيرفر. كل عميل قاعدة
// بيانات مستقلة فمفيش تعارض بينهم، بس بنسيب حد أقصى عشان منفتحش عدد كبير
// جدًا من الاتصالات مرة واحدة لو عدد العملاء زاد. قابل للتعديل عن طريق
// CACHE_WARMUP_CONCURRENCY.
const WARMUP_CONCURRENCY = Number(process.env.CACHE_WARMUP_CONCURRENCY) || 3;

// بيعمل الفحص الشامل (checkAllItemsAcrossBranches) لكل عميل نشط مرة واحدة
// وقت ما السيرفر يبدأ، ويحط النتيجة في نفس الكاش اللي getLowStock بيقرا منه
// (itemsController). كده أول مستخدم حقيقي بعد أي ديبلوي/إعادة تشغيل بيلاقي
// بيانات جاهزة فورًا بدل ما يستنى الفحص الكامل بنفسه.
//
// ملحوظة: الدالة دي بتتنده من app.js من غير await (fire-and-forget) عشان
// السيرفر يبدأ يستقبل طلبات (ومنها /health) فورًا من غير ما ينتظر التسخين.
// المستخدم اللي يفتح الصفحة في أول كام ثانية بعد الديبلوي بالظبط (قبل ما
// التسخين يخلص لعميله هو تحديدًا) لسه ممكن ياخد الفحص الكامل العادي، لكن ده
// نادر جدًا مقارنة بكل الطلبات اللي جاية بعد كده.
async function warmAllClients() {
  console.log('[Warmup] بدء تسخين كاش الأصناف تحت حد إعادة الطلب لكل العملاء...');

  let clients;
  try {
    clients = await clientsRepository.getActiveClients();
  } catch (err) {
    console.error('[Warmup] فشل تحميل قائمة العملاء، هيتم تخطي التسخين:', err.message);
    return;
  }

  if (clients.length === 0) {
    console.log('[Warmup] مفيش عملاء نشطين حاليًا - مفيش حاجة نسخّنها.');
    return;
  }

  await mapWithConcurrency(clients, WARMUP_CONCURRENCY, async (client) => {
    const startedAt = Date.now();
    try {
      const fullConfig = await clientsRepository.getClientConnectionConfig(client.id);
      const pool = await clientPoolManager.getPoolForClient(fullConfig);
      const rows = await multiClientCheckService.checkAllItemsAcrossBranches(pool);
      setLowStockCache(client.id, rows);
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[Warmup] "${client.clientName}": الكاش اتسخن في ${seconds} ثانية (${rows.length} حالة تحت الحد)`);
    } catch (err) {
      console.error(`[Warmup] فشل تسخين الكاش للعميل "${client.clientName}":`, err.message);
    }
  });

  console.log('[Warmup] انتهى تسخين الكاش لكل العملاء.');
}

module.exports = { warmAllClients };
