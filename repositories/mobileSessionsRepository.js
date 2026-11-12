const { sql, getPool } = require('../config/db');

// جلسات refresh للموبايل. كل صف مربوط بجهاز، والتوكن نفسه مش متخزن -
// متخزن SHA-256 hex فقط.

async function createSession({ clientId, deviceId, tokenHash, expiresAt }) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('deviceId', sql.NVarChar(128), deviceId);
  request.input('tokenHash', sql.Char(64), tokenHash);
  request.input('expiresAt', sql.DateTime, expiresAt);
  const result = await request.query(`
    INSERT INTO dbo.StockWatcherMobileSessions_byA
      (ClientId, DeviceId, RefreshTokenHash, ExpiresAt)
    OUTPUT INSERTED.Id
    VALUES (@clientId, @deviceId, @tokenHash, @expiresAt)
  `);
  return result.recordset[0].Id;
}

async function findActiveByHash(tokenHash) {
  const pool = await getPool();
  const request = pool.request();
  request.input('tokenHash', sql.Char(64), tokenHash);
  const result = await request.query(`
    SELECT TOP 1 Id, ClientId, DeviceId, ExpiresAt, RevokedAt
    FROM dbo.StockWatcherMobileSessions_byA
    WHERE RefreshTokenHash = @tokenHash
      AND RevokedAt IS NULL
      AND ExpiresAt > GETDATE()
  `);
  return result.recordset[0] || null;
}

async function revokeById(id) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.BigInt, id);
  await request.query(`
    UPDATE dbo.StockWatcherMobileSessions_byA
    SET RevokedAt = GETDATE()
    WHERE Id = @id AND RevokedAt IS NULL
  `);
}

async function revokeByHash(tokenHash) {
  const pool = await getPool();
  const request = pool.request();
  request.input('tokenHash', sql.Char(64), tokenHash);
  await request.query(`
    UPDATE dbo.StockWatcherMobileSessions_byA
    SET RevokedAt = GETDATE()
    WHERE RefreshTokenHash = @tokenHash AND RevokedAt IS NULL
  `);
}

async function revokeAllForDevice(clientId, deviceId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('deviceId', sql.NVarChar(128), deviceId);
  await request.query(`
    UPDATE dbo.StockWatcherMobileSessions_byA
    SET RevokedAt = GETDATE()
    WHERE ClientId = @clientId AND DeviceId = @deviceId AND RevokedAt IS NULL
  `);
}

async function touch(id) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.BigInt, id);
  await request.query(`
    UPDATE dbo.StockWatcherMobileSessions_byA
    SET LastUsedAt = GETDATE()
    WHERE Id = @id
  `);
}

module.exports = {
  createSession,
  findActiveByHash,
  revokeById,
  revokeByHash,
  revokeAllForDevice,
  touch,
};
