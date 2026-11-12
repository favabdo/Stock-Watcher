const { sql, getPool } = require('../config/db');

// سجل الإشعارات (مركز الإشعارات). DedupeKey فريد لكل عميل، فإدخال نفس
// الحالة مرتين (دورتان متزامنتان) ينتهي بصف واحد فقط.

function mapRow(row) {
  return {
    id: Number(row.Id),
    type: row.Type,
    severity: row.Severity,
    entityType: row.EntityType,
    entityId: row.EntityId === null ? null : Number(row.EntityId),
    entityKey: row.EntityKey,
    titleAr: row.TitleAr,
    bodyAr: row.BodyAr,
    payload: row.PayloadJson ? safeJson(row.PayloadJson) : null,
    read: row.ReadAt !== null,
    readAt: row.ReadAt,
    occurredAt: row.OccurredAt,
  };
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

async function insertNotification(data) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, data.clientId);
  request.input('type', sql.NVarChar(40), data.type);
  request.input('severity', sql.TinyInt, data.severity ?? 2);
  request.input('entityType', sql.NVarChar(20), data.entityType || null);
  request.input('entityId', sql.BigInt, data.entityId ?? null);
  request.input('entityKey', sql.NVarChar(120), data.entityKey || null);
  request.input('titleAr', sql.NVarChar(300), data.titleAr);
  request.input('bodyAr', sql.NVarChar(1000), data.bodyAr);
  request.input('payloadJson', sql.NVarChar(sql.MAX), data.payload ? JSON.stringify(data.payload) : null);
  request.input('dedupeKey', sql.NVarChar(200), data.dedupeKey || null);

  try {
    const result = await request.query(`
      INSERT INTO dbo.StockWatcherNotifications_byA
        (ClientId, Type, Severity, EntityType, EntityId, EntityKey, TitleAr, BodyAr, PayloadJson, DedupeKey)
      OUTPUT INSERTED.Id
      VALUES
        (@clientId, @type, @severity, @entityType, @entityId, @entityKey, @titleAr, @bodyAr, @payloadJson, @dedupeKey)
    `);
    return { id: Number(result.recordset[0].Id), created: true };
  } catch (err) {
    // تصادم DedupeKey = نفس التنبيه اتعمل قبل كده، مش خطأ.
    if (err.number === 2601 || err.number === 2627) {
      return { id: null, created: false };
    }
    throw err;
  }
}

async function list(clientId, { limit = 20, cursor = null, type = null, unreadOnly = false } = {}) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('take', sql.Int, take);
  request.input('cursor', sql.BigInt, cursor ?? null);
  request.input('type', sql.NVarChar(40), type || null);
  request.input('unreadOnly', sql.Bit, unreadOnly ? 1 : 0);

  const result = await request.query(`
    SELECT TOP (@take)
      Id, Type, Severity, EntityType, EntityId, EntityKey, TitleAr, BodyAr,
      PayloadJson, ReadAt, OccurredAt
    FROM dbo.StockWatcherNotifications_byA
    WHERE ClientId = @clientId
      AND (@cursor IS NULL OR Id < @cursor)
      AND (@type IS NULL OR Type = @type)
      AND (@unreadOnly = 0 OR ReadAt IS NULL)
    ORDER BY Id DESC
  `);

  const items = result.recordset.map(mapRow);
  return {
    items,
    nextCursor: items.length === take ? items[items.length - 1].id : null,
  };
}

async function unreadCount(clientId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  const result = await request.query(`
    SELECT COUNT(*) AS Total
    FROM dbo.StockWatcherNotifications_byA
    WHERE ClientId = @clientId AND ReadAt IS NULL
  `);
  return Number(result.recordset[0].Total) || 0;
}

async function markRead(clientId, id) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('id', sql.BigInt, id);
  const result = await request.query(`
    UPDATE dbo.StockWatcherNotifications_byA
    SET ReadAt = GETDATE()
    WHERE ClientId = @clientId AND Id = @id AND ReadAt IS NULL
  `);
  return result.rowsAffected[0] || 0;
}

async function markAllRead(clientId, upToId = null) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('upToId', sql.BigInt, upToId ?? null);
  const result = await request.query(`
    UPDATE dbo.StockWatcherNotifications_byA
    SET ReadAt = GETDATE()
    WHERE ClientId = @clientId
      AND ReadAt IS NULL
      AND (@upToId IS NULL OR Id <= @upToId)
  `);
  return result.rowsAffected[0] || 0;
}

async function getManyByIds(ids) {
  if (!ids || ids.length === 0) return new Map();
  const pool = await getPool();
  const request = pool.request();
  const params = ids.map((id, i) => {
    request.input(`id${i}`, sql.BigInt, id);
    return `@id${i}`;
  });
  const result = await request.query(`
    SELECT Id, ClientId, Type, Severity, EntityType, EntityId, EntityKey,
           TitleAr, BodyAr, PayloadJson
    FROM dbo.StockWatcherNotifications_byA
    WHERE Id IN (${params.join(', ')})
  `);
  const byId = new Map();
  for (const row of result.recordset) {
    byId.set(Number(row.Id), {
      id: Number(row.Id),
      clientId: row.ClientId,
      type: row.Type,
      severity: row.Severity,
      entityType: row.EntityType,
      entityId: row.EntityId === null ? null : Number(row.EntityId),
      entityKey: row.EntityKey,
      titleAr: row.TitleAr,
      bodyAr: row.BodyAr,
      payload: row.PayloadJson ? safeJson(row.PayloadJson) : null,
    });
  }
  return byId;
}

async function countSince(clientId, since) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('since', sql.DateTime, since);
  const result = await request.query(`
    SELECT Type, COUNT(*) AS Total
    FROM dbo.StockWatcherNotifications_byA
    WHERE ClientId = @clientId AND OccurredAt >= @since
    GROUP BY Type
  `);
  const counts = {};
  for (const row of result.recordset) counts[row.Type] = Number(row.Total);
  return counts;
}

module.exports = {
  insertNotification,
  list,
  unreadCount,
  markRead,
  markAllRead,
  getManyByIds,
  countSince,
};
