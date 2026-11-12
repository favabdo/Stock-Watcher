const mobileDevicesRepository = require('../repositories/mobileDevicesRepository');
const { normalizeDevicePayload, isValidDevicePayload } = require('../utils/deviceInfo');
const { httpError } = require('../utils/apiError');

async function register(req, res, next) {
  try {
    const device = normalizeDevicePayload(req.body || {});
    if (!isValidDevicePayload(device)) {
      throw httpError(400, 'VALIDATION_ERROR', 'بيانات الجهاز غير صالحة');
    }
    if (!device.pushToken) {
      throw httpError(400, 'VALIDATION_ERROR', 'pushToken مطلوب لتسجيل الإشعارات');
    }

    const row = await mobileDevicesRepository.upsertDevice({
      clientId: req.client.id,
      ...device,
    });

    res.status(201).json({ deviceId: row.DeviceId, enabled: !!row.Enabled });
  } catch (err) {
    next(err);
  }
}

async function patch(req, res, next) {
  try {
    const deviceId = String(req.params.deviceId || '').trim();
    if (!deviceId) throw httpError(400, 'VALIDATION_ERROR', 'deviceId مطلوب');

    const patchData = {};
    if (req.body?.pushToken !== undefined) patchData.pushToken = String(req.body.pushToken).trim();
    if (req.body?.appVersion !== undefined) patchData.appVersion = String(req.body.appVersion).trim();
    if (req.body?.osVersion !== undefined) patchData.osVersion = String(req.body.osVersion).trim();
    if (req.body?.locale !== undefined) patchData.locale = String(req.body.locale).trim();
    if (req.body?.enabled !== undefined) patchData.enabled = !!req.body.enabled;

    const row = await mobileDevicesRepository.updateDevice(req.client.id, deviceId, patchData);
    if (!row) throw httpError(404, 'DEVICE_NOT_FOUND', 'الجهاز غير مسجل');

    res.json({ deviceId: row.DeviceId, enabled: !!row.Enabled });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deviceId = String(req.params.deviceId || '').trim();
    if (!deviceId) throw httpError(400, 'VALIDATION_ERROR', 'deviceId مطلوب');
    await mobileDevicesRepository.removeDevice(req.client.id, deviceId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, patch, remove };
