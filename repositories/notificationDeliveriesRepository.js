const { sql, getPool } = require('../config/db');

// Outbox للتسليم: كل إشعار يتعمل له صف لكل جهاز/رقم. الـ dispatcher بيسحب
// دفعة ذرّية، ولو فشل الإرسال بيرجّعها بـ backoff بدل ما تضيع.

async function enqueue(notificationId, channel, target, deviceId = null) {
  const pool = await getPool();
  const request = pool.request();
  request.input('notificationId', sql.BigInt, notificationId);
  request.input('channel', sql.NVarChar(12), channel);
  request.input('target', sql.NVarChar(512), target || null);
  request.input('deviceId', sql.NVarChar(128), deviceId || null);
  const result = await request.query(`
    INSERT INTO dbo.StockWatcherNotificationDeliveries_byA
      (NotificationId, Channel, Target, DeviceId, Status)
    OUTPUT INSERTED.Id
    VALUES (@notificationId, @channel, @target, @deviceId, 'pending')
  `);
  return Number(result.recordset[0].Id);
}

async function claimBatch(limit = 25) {
  const pool = await getPool();
  const request = pool.request();
  request.input('take', sql.Int, limit);
  const result = await request.query(`
    ;WITH due AS (
      SELECT TOP (@take) *
      FROM dbo.StockWatcherNotificationDeliveries_byA WITH (UPDLOCK, READPAST, ROWLOCK)
      WHERE (
              Status = 'pending'
              AND (NextAttemptAt IS NULL OR NextAttemptAt <= GETDATE())
            )
         OR (
              Status = 'failed'
              AND NextAttemptAt IS NOT NULL
              AND NextAttemptAt <= GETDATE()
            )
         -- استرجاع دفعات علقت في 'sending' لو العملية وقعت قبل ما تحط النتيجة.
         OR (
              Status = 'sending'
              AND NextAttemptAt IS NOT NULL
              AND NextAttemptAt <= GETDATE()
            )
      ORDER BY Id
    )
    UPDATE due
    SET Status = 'sending',
        Attempts = Attempts + 1,
        NextAttemptAt = DATEADD(MINUTE, 30, GETDATE())
    OUTPUT INSERTED.Id, INSERTED.NotificationId, INSERTED.Channel, INSERTED.Target,
           INSERTED.DeviceId, INSERTED.Attempts;
  `);
  return result.recordset.map((r) => ({
    id: Number(r.Id),
    notificationId: Number(r.NotificationId),
    channel: r.Channel,
    target: r.Target,
    deviceId: r.DeviceId,
    attempts: r.Attempts,
  }));
}

async function markSent(id) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.BigInt, id);
  await request.query(`
    UPDATE dbo.StockWatcherNotificationDeliveries_byA
    SET Status = 'sent', SentAt = GETDATE(), LastError = NULL, NextAttemptAt = NULL
    WHERE Id = @id
  `);
}

async function markFailed(id, error, nextAttemptAt) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.BigInt, id);
  request.input('error', sql.NVarChar(500), String(error || '').slice(0, 500));
  request.input('nextAttemptAt', sql.DateTime, nextAttemptAt || null);
  await request.query(`
    UPDATE dbo.StockWatcherNotificationDeliveries_byA
    SET Status = 'failed',
        LastError = @error,
        NextAttemptAt = @nextAttemptAt,
        Attempts = Attempts
    WHERE Id = @id
  `);
}

async function markSkipped(id, reason) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.BigInt, id);
  request.input('reason', sql.NVarChar(500), String(reason || '').slice(0, 500));
  await request.query(`
    UPDATE dbo.StockWatcherNotificationDeliveries_byA
    SET Status = 'skipped', LastError = @reason, NextAttemptAt = NULL
    WHERE Id = @id
  `);
}

module.exports = { enqueue, claimBatch, markSent, markFailed, markSkipped };
