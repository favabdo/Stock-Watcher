const fs = require('fs');
const path = require('path');

/**
 * بيقرأ كل ملفات .sql الموجودة في مجلد migrations وينفذها بالترتيب الأبجدي
 * على نفس الـ pool المتصل بقاعدة البيانات.
 *
 * كل ملف لازم يكون مكتوب بصيغة idempotent (زي IF NOT EXISTS ... CREATE TABLE)
 * عشان لو اتنفذ أكتر من مرة (مع كل ديبلوي/تشغيل للسيرفر) ما يعملش أي مشكلة:
 * لو الجدول موجود بالفعل، السكريبت هيتخطاه من غير أي تغيير. لو مش موجود، هينشئه.
 *
 * الترتيب الأبجدي لأسماء الملفات هو اللي بيحدد ترتيب التنفيذ، فلازم أي ملف
 * migration جديد ياخد رقم أكبر من اللي قبله، مثال:
 *   001_create_stock_watcher_users_bya.sql
 *   002_add_something_else.sql
 */
async function runMigrations(pool) {
  const migrationsDir = __dirname;
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[Migrations] لا يوجد ملفات migration للتشغيل.');
    return;
  }

  console.log(`[Migrations] هيتم فحص/تشغيل ${files.length} ملف migration...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sqlText = fs.readFileSync(filePath, 'utf8').trim();

    if (!sqlText) continue;

    try {
      await pool.request().batch(sqlText);
      console.log(`[Migrations] ✔ تم تنفيذ/التأكد من: ${file}`);
    } catch (err) {
      console.error(`[Migrations] ✘ فشل تنفيذ ${file}:`, err.message);
      throw err;
    }
  }

  console.log('[Migrations] تم التأكد من كل الجداول المطلوبة.');
}

module.exports = runMigrations;
