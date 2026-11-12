const PLATFORMS = new Set(['android', 'ios']);

function normalizeDevicePayload(body = {}) {
  return {
    deviceId: String(body.deviceId || '').trim(),
    platform: String(body.platform || 'android').trim().toLowerCase(),
    pushToken: body.pushToken ? String(body.pushToken).trim() : null,
    appVersion: body.appVersion ? String(body.appVersion).trim().slice(0, 32) : null,
    osVersion: body.osVersion ? String(body.osVersion).trim().slice(0, 32) : null,
    locale: body.locale ? String(body.locale).trim().slice(0, 16) : null,
  };
}

function isValidDevicePayload(device) {
  return (
    device.deviceId.length > 0 &&
    device.deviceId.length <= 128 &&
    PLATFORMS.has(device.platform) &&
    (!device.pushToken || device.pushToken.length <= 512)
  );
}

module.exports = { normalizeDevicePayload, isValidDevicePayload };
