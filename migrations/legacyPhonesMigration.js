const clientPhonesRepository = require('../repositories/clientPhonesRepository');

// بيحول قيمة عمود WhatsappPhone القديم (JSON زي [{"phone":"...","enabled":true}]
// أو نص/أرقام مفصولة بفاصلة/فاصلة منقوطة/سطر جديد) لمصفوفة [{phone, enabled}]
// - نفس منطق whatsappService.parsePhoneEntries، متكرر هنا عشان الملف ده
// مايعتمدش على أي حاجة تانية غير الشكل الخام للنص.
function parseLegacyPhoneValue(raw) {
  const value = String(raw || '').trim();
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => ({ phone: String(p.phone || '').trim(), enabled: p.enabled !== false }))
        .filter((p) => p.phone);
    }
  } catch (err) {
    // مش JSON - يبقى الشكل القديم، هنكمل تحت
  }

  return value
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((phone) => ({ phone, enabled: true }));
}

// بيترحّل أرقام واتساب العميل من العمود القديم (WhatsappPhone) لجدول
// StockWatcherClientPhones_byA الجديد، مرة واحدة بس - وبيتعامل مع الترحيل في
// كود Node.js (مش T-SQL) عشان يشتغل بنفس الطريقة على أي نسخة SQL Server، من
// غير الاعتماد على OPENJSON/STRING_SPLIT اللي مش متاحة في النسخ الأقدم.
//
// آمن يتشغل مع كل تشغيل سيرفر: بيتجاهل أي عميل عنده أرقام في الجدول الجديد
// بالفعل (يعني اترحّل قبل كده أو الأدمن ضاف له أرقام يدويًا)، وبيتجاهل أي
// عميل من غير عمود WhatsappPhone خالص (لو اتشال بالفعل من قاعدة البيانات).
async function migrateLegacyPhones(pool) {
  const columnCheck = await pool.request().query(`
    SELECT 1 AS found
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.StockWatcherUsers_byA') AND name = 'WhatsappPhone'
  `);
  if (columnCheck.recordset.length === 0) {
    console.log('[LegacyPhonesMigration] عمود WhatsappPhone القديم مش موجود - مفيش حاجة نترحّلها.');
    return;
  }

  const clientsResult = await pool.request().query(`
    SELECT Id, WhatsappPhone FROM dbo.StockWatcherUsers_byA
  `);
  const clients = clientsResult.recordset;
  if (clients.length === 0) return;

  const clientIds = clients.map((c) => c.Id);
  const existingPhonesByClient = await clientPhonesRepository.getPhonesForClients(clientIds);

  let migratedCount = 0;
  for (const client of clients) {
    const alreadyHasPhones = (existingPhonesByClient.get(client.Id) || []).length > 0;
    if (alreadyHasPhones) continue;

    const entries = parseLegacyPhoneValue(client.WhatsappPhone);
    if (entries.length === 0) continue;

    try {
      await clientPhonesRepository.replacePhonesForClient(client.Id, entries);
      migratedCount += 1;
    } catch (err) {
      console.error(`[LegacyPhonesMigration] فشل ترحيل أرقام العميل ${client.Id}:`, err.message);
    }
  }

  if (migratedCount > 0) {
    console.log(`[LegacyPhonesMigration] تم ترحيل أرقام واتساب لـ ${migratedCount} عميل من العمود القديم للجدول الجديد.`);
  } else {
    console.log('[LegacyPhonesMigration] مفيش أرقام جديدة محتاجة ترحيل (كل العملاء مترحّلين بالفعل أو مفيش أرقام قديمة).');
  }
}

module.exports = migrateLegacyPhones;
