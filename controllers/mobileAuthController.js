const clientsRepository = require('../repositories/clientsRepository');
const mobileSessionsRepository = require('../repositories/mobileSessionsRepository');
const mobileDevicesRepository = require('../repositories/mobileDevicesRepository');
const alertSettingsRepository = require('../repositories/alertSettingsRepository');
const { comparePassword } = require('../utils/password');
const { signClientToken } = require('../utils/clientToken');
const { generateRefreshToken, hashRefreshToken } = require('../utils/refreshToken');
const { normalizeDevicePayload, isValidDevicePayload } = require('../utils/deviceInfo');
const { httpError } = require('../utils/apiError');

const ACCESS_TTL = process.env.MOBILE_ACCESS_TOKEN_TTL || '60m';
const REFRESH_DAYS = Number(process.env.MOBILE_REFRESH_TOKEN_DAYS) || 60;

function ttlSeconds(ttl) {
  const match = String(ttl).match(/^(\d+)([smhd])?$/);
  if (!match) return 3600;
  const value = Number(match[1]);
  const unit = match[2] || 's';
  return value * { s: 1, m: 60, h: 3600, d: 86400 }[unit];
}

function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_DAYS * 86400 * 1000);
}

function publicSettings(settings) {
  if (!settings) return null;
  return {
    stockLowEnabled: settings.stockLowEnabled,
    stockZeroEnabled: settings.stockZeroEnabled,
    reorderSuggestionEnabled: settings.reorderSuggestionEnabled,
    creditOverEnabled: settings.creditOverEnabled,
    creditIncreaseEnabled: settings.creditIncreaseEnabled,
    creditIncreaseThreshold: settings.creditIncreaseThreshold,
    digestEnabled: settings.digestEnabled,
    digestFrequency: settings.digestFrequency,
    digestTimeOfDay: settings.digestTimeOfDay,
    digestWeekday: settings.digestWeekday,
    timeZone: settings.timeZone,
    pushEnabled: settings.pushEnabled,
    whatsAppEnabled: settings.whatsAppEnabled,
  };
}

function publicClient(client) {
  return { id: client.id, clientName: client.clientName, role: client.role ?? 0 };
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    const device = normalizeDevicePayload(req.body?.device || {});

    if (!username || !password) {
      throw httpError(400, 'VALIDATION_ERROR', 'لازم تكتب اليوزر والباسورد');
    }
    if (!isValidDevicePayload(device)) {
      throw httpError(400, 'VALIDATION_ERROR', 'بيانات الجهاز غير صالحة');
    }

    const client = await clientsRepository.getClientLoginByUsername(String(username).trim());
    if (!client || !client.isActive) {
      throw httpError(401, 'INVALID_CREDENTIALS', 'اليوزر أو الباسورد غلط');
    }

    const ok = await comparePassword(password, client.loginPasswordHash);
    if (!ok) {
      throw httpError(401, 'INVALID_CREDENTIALS', 'اليوزر أو الباسورد غلط');
    }

    const settings = await alertSettingsRepository.getByClientId(client.id);
    const accessToken = signClientToken(client, {
      ttl: ACCESS_TTL,
      extraClaims: { aud: 'mobile' },
    });
    const refreshToken = generateRefreshToken();

    await mobileSessionsRepository.createSession({
      clientId: client.id,
      deviceId: device.deviceId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    });

    if (device.pushToken) {
      await mobileDevicesRepository.upsertDevice({ clientId: client.id, ...device });
    }

    res.json({
      accessToken,
      expiresIn: ttlSeconds(ACCESS_TTL),
      refreshToken,
      client: publicClient(client),
      settings: publicSettings(settings),
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken, deviceId } = req.body || {};
    if (!refreshToken) {
      throw httpError(400, 'VALIDATION_ERROR', 'refreshToken مطلوب');
    }

    const session = await mobileSessionsRepository.findActiveByHash(hashRefreshToken(refreshToken));
    if (!session) {
      throw httpError(401, 'SESSION_EXPIRED', 'الجلسة منتهية. سجل دخول تاني.');
    }
    if (deviceId && String(deviceId) !== session.DeviceId) {
      throw httpError(401, 'SESSION_EXPIRED', 'الجلسة لا تطابق الجهاز.');
    }

    const client = await clientsRepository.getClientForToken(session.ClientId);
    if (!client || !client.isActive) {
      throw httpError(403, 'CLIENT_INACTIVE', 'حساب العميل متوقف.');
    }

    // Rotation: التوكن القديم يُبطل فورًا، والجديد يُخزَّن كـ hash.
    await mobileSessionsRepository.revokeById(session.Id);
    const nextRefreshToken = generateRefreshToken();
    await mobileSessionsRepository.createSession({
      clientId: client.id,
      deviceId: session.DeviceId,
      tokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: refreshExpiryDate(),
    });

    const accessToken = signClientToken(client, {
      ttl: ACCESS_TTL,
      extraClaims: { aud: 'mobile' },
    });

    res.json({
      accessToken,
      expiresIn: ttlSeconds(ACCESS_TTL),
      refreshToken: nextRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

// الإلغاء لا يحتاج access token صالح (ممكن يكون منتهيًا)، يكفيه refresh token.
async function logout(req, res, next) {
  try {
    const { refreshToken, deviceId } = req.body || {};
    if (!refreshToken && !deviceId) {
      throw httpError(400, 'VALIDATION_ERROR', 'refreshToken أو deviceId مطلوب');
    }

    let clientId = req.client?.id || null;

    if (refreshToken) {
      const session = await mobileSessionsRepository.findActiveByHash(hashRefreshToken(refreshToken));
      if (session) clientId = session.ClientId;
      await mobileSessionsRepository.revokeByHash(hashRefreshToken(refreshToken));
    }

    if (deviceId && clientId) {
      await mobileSessionsRepository.revokeAllForDevice(clientId, deviceId);
      await mobileDevicesRepository.removeDevice(clientId, deviceId);
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout, publicSettings };
