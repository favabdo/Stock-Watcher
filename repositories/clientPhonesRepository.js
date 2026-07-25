const { sql, getPool } = require('../config/db');

// بيرجع كل الأرقام بتاعة عميل واحد، من الأحدث للأقدم.
async function getPhonesForClient(clientId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  const result = await request.query(`
    SELECT Id, Phone, Enabled
    FROM dbo.StockWatcherClientPhones_byA
    WHERE ClientId = @clientId
    ORDER BY Id
  `);
  return result.recordset.map((r) => ({ id: r.Id, phone: r.Phone, enabled: !!r.Enabled }));
}

// بيرجع أرقام كل العملاء المطلوبين دفعة واحدة (نداء واحد للـ DB بدل ما نلف
// عميل عميل - N+1)، كـ Map: clientId -> [{id, phone, enabled}, ...].
// لو clientIds مش موجودة (undefined) بيرجع أرقام كل العملاء.
async function getPhonesForClients(clientIds = null) {
  const pool = await getPool();
  const request = pool.request();

  let whereClause = '';
  if (Array.isArray(clientIds)) {
    if (clientIds.length === 0) return new Map();
    const params = clientIds.map((id, i) => {
      request.input(`clientId${i}`, sql.Int, id);
      return `@clientId${i}`;
    });
    whereClause = `WHERE ClientId IN (${params.join(', ')})`;
  }

  const result = await request.query(`
    SELECT Id, ClientId, Phone, Enabled
    FROM dbo.StockWatcherClientPhones_byA
    ${whereClause}
    ORDER BY Id
  `);

  const byClient = new Map();
  for (const r of result.recordset) {
    if (!byClient.has(r.ClientId)) byClient.set(r.ClientId, []);
    byClient.get(r.ClientId).push({ id: r.Id, phone: r.Phone, enabled: !!r.Enabled });
  }
  return byClient;
}

// بيستبدل كل أرقام العميل بالمجموعة الجديدة (بيمسح القديم ويكتب الجديد في
// نفس الترانزاكشن) - أبسط وأضمن طريقة عشان الفورم في الفرونت إند بيبعت
// اللستة كاملة في كل حفظ (إضافة/تعديل/حذف/تعطيل رقم كله بيتبعت مع بعضه).
// phones: [{ phone: '201...', enabled: true }, ...]
async function replacePhonesForClient(clientId, phones) {
  const cleaned = (phones || [])
    .map((p) => ({ phone: String(p.phone || '').trim(), enabled: p.enabled !== false }))
    .filter((p) => p.phone);

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const deleteRequest = new sql.Request(transaction);
    deleteRequest.input('clientId', sql.Int, clientId);
    await deleteRequest.query(`DELETE FROM dbo.StockWatcherClientPhones_byA WHERE ClientId = @clientId`);

    for (const entry of cleaned) {
      const insertRequest = new sql.Request(transaction);
      insertRequest.input('clientId', sql.Int, clientId);
      insertRequest.input('phone', sql.NVarChar(30), entry.phone);
      insertRequest.input('enabled', sql.Bit, entry.enabled);
      await insertRequest.query(`
        INSERT INTO dbo.StockWatcherClientPhones_byA (ClientId, Phone, Enabled)
        VALUES (@clientId, @phone, @enabled)
      `);
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return cleaned;
}

module.exports = { getPhonesForClient, getPhonesForClients, replacePhonesForClient };
