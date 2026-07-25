const app = require('./app');
const { getPool } = require('./config/db');
const runMigrations = require('./migrations/runMigrations');
const migrateLegacyPhones = require('./migrations/legacyPhonesMigration');

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    // بيتأكد إن كل الجداول المطلوبة موجودة في قاعدة البيانات قبل ما السيرفر يبدأ يستقبل طلبات.
    // لو الجداول موجودة بالفعل (زي في بيئة الإنتاج) مش هيحصل أي تغيير - آمن يتنفذ مع كل ديبلوي.
    const pool = await getPool();
    await runMigrations(pool);

    // ترحيل أرقام واتساب من العمود القديم للجدول الجديد (مرة واحدة، آمن
    // يتكرر) - منفصل عن runMigrations لأنه بيتم في كود Node.js مش T-SQL خام.
    try {
      await migrateLegacyPhones(pool);
    } catch (err) {
      console.error('[Startup] فشل ترحيل أرقام الواتساب القديمة (مش حرج - الجدول الجديد شغال، بس محتاج تتأكد من نقل الأرقام يدويًا لو فيه عملاء قدام):', err.message);
    }
  } catch (err) {
    console.error('[Startup] فشل التأكد من/إنشاء الجداول، السيرفر هيقوم برضه لكن ممكن يحصل أخطاء في التعامل مع الداتابيز:', err.message);
  }

  app.listen(PORT, () => console.log(`Stock Watcher running on port ${PORT}`));
})();
