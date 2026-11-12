const { sql, getPool } = require('../config/db');

// مصدر الحقيقة لإعدادات التنبيهات. الأعمدة القديمة في StockWatcherUsers_byA
// بتتزامن عند أي حفظ عشان الويب الحالي يفضل شغال بنفس السلوك.

function mapRow(row) {
  return {
    clientId: row.ClientId,
    stockLowEnabled: !!row.StockLowEnabled,
    stockZeroEnabled: !!row.StockZeroEnabled,
    reorderSuggestionEnabled: !!row.ReorderSuggestionEnabled,
    creditOverEnabled: !!row.CreditOverEnabled,
    creditIncreaseEnabled: !!row.CreditIncreaseEnabled,
    creditIncreaseThreshold: Number(row.CreditIncreaseThreshold) || 0,
    digestEnabled: !!row.DigestEnabled,
    digestFrequency: row.DigestFrequency || 'daily',
    digestTimeOfDay: row.DigestTimeOfDay || '08:00',
    digestWeekday: row.DigestWeekday == null ? 6 : Number(row.DigestWeekday),
    timeZone: row.TimeZone || 'Africa/Cairo',
    pushEnabled: !!row.PushEnabled,
    whatsAppEnabled: !!row.WhatsAppEnabled,
    lastDigestSentAt: row.LastDigestSentAt,
    updatedAt: row.UpdatedAt,
  };
}

async function ensureSettings(clientId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  await request.query(`
    INSERT INTO dbo.StockWatcherAlertSettings_byA (ClientId, StockLowEnabled, CreditOverEnabled)
    SELECT u.Id, u.AlertStockEnabled, u.AlertCreditLimitEnabled
    FROM dbo.StockWatcherUsers_byA u
    WHERE u.Id = @clientId
      AND NOT EXISTS (
        SELECT 1 FROM dbo.StockWatcherAlertSettings_byA s WHERE s.ClientId = u.Id
      )
  `);
}

async function getByClientId(clientId) {
  await ensureSettings(clientId);
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  const result = await request.query(`
    SELECT * FROM dbo.StockWatcherAlertSettings_byA WHERE ClientId = @clientId
  `);
  return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function upsert(clientId, settings) {
  await ensureSettings(clientId);
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('stockLow', sql.Bit, settings.stockLowEnabled ? 1 : 0);
  request.input('stockZero', sql.Bit, settings.stockZeroEnabled ? 1 : 0);
  request.input('reorder', sql.Bit, settings.reorderSuggestionEnabled ? 1 : 0);
  request.input('creditOver', sql.Bit, settings.creditOverEnabled ? 1 : 0);
  request.input('creditIncrease', sql.Bit, settings.creditIncreaseEnabled ? 1 : 0);
  request.input('creditThreshold', sql.Decimal(18, 2), Number(settings.creditIncreaseThreshold) || 0);
  request.input('digestEnabled', sql.Bit, settings.digestEnabled ? 1 : 0);
  request.input('digestFrequency', sql.NVarChar(10), settings.digestFrequency || 'daily');
  request.input('digestTime', sql.Char(5), settings.digestTimeOfDay || '08:00');
  request.input('digestWeekday', sql.TinyInt, settings.digestWeekday == null ? 6 : Number(settings.digestWeekday));
  request.input('timeZone', sql.NVarChar(64), settings.timeZone || 'Africa/Cairo');
  request.input('pushEnabled', sql.Bit, settings.pushEnabled === false ? 0 : 1);
  request.input('whatsAppEnabled', sql.Bit, settings.whatsAppEnabled === false ? 0 : 1);

  await request.query(`
    UPDATE dbo.StockWatcherAlertSettings_byA
    SET StockLowEnabled = @stockLow,
        StockZeroEnabled = @stockZero,
        ReorderSuggestionEnabled = @reorder,
        CreditOverEnabled = @creditOver,
        CreditIncreaseEnabled = @creditIncrease,
        CreditIncreaseThreshold = @creditThreshold,
        DigestEnabled = @digestEnabled,
        DigestFrequency = @digestFrequency,
        DigestTimeOfDay = @digestTime,
        DigestWeekday = @digestWeekday,
        TimeZone = @timeZone,
        PushEnabled = @pushEnabled,
        WhatsAppEnabled = @whatsAppEnabled,
        UpdatedAt = GETDATE()
    WHERE ClientId = @clientId;

    -- توافق خلفي: الويب الحالي/توكن الويب بيقرأ الأعمدة القديمة دي.
    UPDATE dbo.StockWatcherUsers_byA
    SET AlertStockEnabled = CASE WHEN @stockLow = 1 OR @stockZero = 1 THEN 1 ELSE 0 END,
        AlertCreditLimitEnabled = CASE WHEN @creditOver = 1 OR @creditIncrease = 1 THEN 1 ELSE 0 END
    WHERE Id = @clientId;
  `);

  return getByClientId(clientId);
}

async function getDigestCandidates() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT s.*, u.ClientName
    FROM dbo.StockWatcherAlertSettings_byA s
    INNER JOIN dbo.StockWatcherUsers_byA u ON u.Id = s.ClientId
    WHERE s.DigestEnabled = 1 AND u.IsActive = 1
  `);
  return result.recordset.map((row) => ({
    ...mapRow(row),
    clientName: row.ClientName,
  }));
}

// حجز ذرّي لدورة digest واحدة لكل عميل. cooldownHours يمنع التكرار لو
// السيرفر اشتغل مرتين في نفس النافذة الزمنية.
async function claimDigest(clientId, cooldownHours = 20) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('cooldown', sql.Int, cooldownHours);
  const result = await request.query(`
    UPDATE dbo.StockWatcherAlertSettings_byA
    SET LastDigestSentAt = GETDATE(), UpdatedAt = GETDATE()
    WHERE ClientId = @clientId
      AND (LastDigestSentAt IS NULL
           OR LastDigestSentAt < DATEADD(HOUR, -@cooldown, GETDATE()))
  `);
  return (result.rowsAffected[0] || 0) > 0;
}

module.exports = { getByClientId, upsert, getDigestCandidates, claimDigest };
