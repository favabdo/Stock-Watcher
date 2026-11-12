const { sql, getPool } = require('../config/db');

// الأجهزة المسجلة لكل عميل. DeviceId ثابت من التطبيق، والـ PushToken بيتغير
// من وقت للتاني فبنحدّثه في نفس صف الجهاز بدل ما نكرر الأجهزة.

async function getDevice(clientId, deviceId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('deviceId', sql.NVarChar(128), deviceId);
  const result = await request.query(`
    SELECT Id, ClientId, DeviceId, Platform, PushToken, AppVersion, OsVersion,
           Locale, Enabled, CreatedAt, UpdatedAt, LastSeenAt
    FROM dbo.StockWatcherMobileDevices_byA
    WHERE ClientId = @clientId AND DeviceId = @deviceId
  `);
  return result.recordset[0] || null;
}

async function upsertDevice(input) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, input.clientId);
  request.input('deviceId', sql.NVarChar(128), input.deviceId);
  request.input('platform', sql.NVarChar(16), input.platform);
  request.input('pushToken', sql.NVarChar(512), input.pushToken || null);
  request.input('appVersion', sql.NVarChar(32), input.appVersion || null);
  request.input('osVersion', sql.NVarChar(32), input.osVersion || null);
  request.input('locale', sql.NVarChar(16), input.locale || null);

  try {
    await request.query(`
      UPDATE dbo.StockWatcherMobileDevices_byA
      SET Platform = @platform,
          PushToken = @pushToken,
          AppVersion = @appVersion,
          OsVersion = @osVersion,
          Locale = @locale,
          Enabled = 1,
          UpdatedAt = GETDATE(),
          LastSeenAt = GETDATE()
      WHERE ClientId = @clientId AND DeviceId = @deviceId;

      IF @@ROWCOUNT = 0
      BEGIN
        INSERT INTO dbo.StockWatcherMobileDevices_byA
          (ClientId, DeviceId, Platform, PushToken, AppVersion, OsVersion, Locale, Enabled, LastSeenAt)
        VALUES
          (@clientId, @deviceId, @platform, @pushToken, @appVersion, @osVersion, @locale, 1, GETDATE());
      END
    `);
  } catch (err) {
    // سباق نادر بين تسجيلين لنفس الجهاز. الصف موجود بالفعل - نعمل تحديث مباشر.
    if (err.number === 2601 || err.number === 2627) {
      await updateDevice(input.clientId, input.deviceId, {
        pushToken: input.pushToken,
        appVersion: input.appVersion,
        osVersion: input.osVersion,
        locale: input.locale,
        enabled: true,
      });
    } else {
      throw err;
    }
  }

  return getDevice(input.clientId, input.deviceId);
}

async function updateDevice(clientId, deviceId, patch = {}) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('deviceId', sql.NVarChar(128), deviceId);

  const sets = [];
  if (patch.pushToken !== undefined) {
    request.input('pushToken', sql.NVarChar(512), patch.pushToken || null);
    sets.push('PushToken = @pushToken');
  }
  if (patch.appVersion !== undefined) {
    request.input('appVersion', sql.NVarChar(32), patch.appVersion || null);
    sets.push('AppVersion = @appVersion');
  }
  if (patch.osVersion !== undefined) {
    request.input('osVersion', sql.NVarChar(32), patch.osVersion || null);
    sets.push('OsVersion = @osVersion');
  }
  if (patch.locale !== undefined) {
    request.input('locale', sql.NVarChar(16), patch.locale || null);
    sets.push('Locale = @locale');
  }
  if (patch.enabled !== undefined) {
    request.input('enabled', sql.Bit, patch.enabled ? 1 : 0);
    sets.push('Enabled = @enabled');
  }

  if (sets.length === 0) return getDevice(clientId, deviceId);

  sets.push('UpdatedAt = GETDATE()', 'LastSeenAt = GETDATE()');
  await request.query(`
    UPDATE dbo.StockWatcherMobileDevices_byA
    SET ${sets.join(', ')}
    WHERE ClientId = @clientId AND DeviceId = @deviceId
  `);
  return getDevice(clientId, deviceId);
}

async function getEnabledDevices(clientId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  const result = await request.query(`
    SELECT Id, DeviceId, Platform, PushToken
    FROM dbo.StockWatcherMobileDevices_byA
    WHERE ClientId = @clientId AND Enabled = 1 AND PushToken IS NOT NULL
    ORDER BY Id
  `);
  return result.recordset;
}

async function disableByPushToken(pushToken) {
  if (!pushToken) return 0;
  const pool = await getPool();
  const request = pool.request();
  request.input('pushToken', sql.NVarChar(512), pushToken);
  const result = await request.query(`
    UPDATE dbo.StockWatcherMobileDevices_byA
    SET Enabled = 0, UpdatedAt = GETDATE()
    WHERE PushToken = @pushToken
  `);
  return result.rowsAffected[0] || 0;
}

async function removeDevice(clientId, deviceId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, clientId);
  request.input('deviceId', sql.NVarChar(128), deviceId);
  const result = await request.query(`
    DELETE FROM dbo.StockWatcherMobileDevices_byA
    WHERE ClientId = @clientId AND DeviceId = @deviceId
  `);
  return result.rowsAffected[0] || 0;
}

module.exports = {
  getDevice,
  upsertDevice,
  updateDevice,
  getEnabledDevices,
  disableByPushToken,
  removeDevice,
};
