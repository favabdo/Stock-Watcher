const alertSettingsRepository = require('../repositories/alertSettingsRepository');
const { httpError } = require('../utils/apiError');

const BOOLEAN_KEYS = [
  'stockLowEnabled',
  'stockZeroEnabled',
  'reorderSuggestionEnabled',
  'creditOverEnabled',
  'creditIncreaseEnabled',
  'digestEnabled',
  'pushEnabled',
  'whatsAppEnabled',
];

function validateSettings(settings) {
  const atLeastOneAlert =
    settings.stockLowEnabled ||
    settings.stockZeroEnabled ||
    settings.creditOverEnabled ||
    settings.creditIncreaseEnabled;
  if (!atLeastOneAlert) {
    throw httpError(
      422,
      'VALIDATION_ERROR',
      'لازم تفعّل نوع تنبيه واحد على الأقل: نقص المخزون أو نفاد المخزون أو تجاوز الائتمان'
    );
  }

  if (!['daily', 'weekly'].includes(settings.digestFrequency)) {
    throw httpError(422, 'VALIDATION_ERROR', 'digestFrequency لازم daily أو weekly');
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(settings.digestTimeOfDay)) {
    throw httpError(422, 'VALIDATION_ERROR', 'digestTimeOfDay لازم بصيغة HH:MM');
  }

  if (!Number.isInteger(Number(settings.digestWeekday)) || Number(settings.digestWeekday) < 0 || Number(settings.digestWeekday) > 6) {
    throw httpError(422, 'VALIDATION_ERROR', 'digestWeekday لازم رقم من 0 إلى 6');
  }

  if (Number(settings.creditIncreaseThreshold) < 0) {
    throw httpError(422, 'VALIDATION_ERROR', 'creditIncreaseThreshold لازم يكون 0 أو أكثر');
  }

  return settings;
}

function mergeSettings(current, body) {
  const next = { ...current };
  for (const key of BOOLEAN_KEYS) {
    if (body[key] !== undefined) next[key] = !!body[key];
  }
  if (body.creditIncreaseThreshold !== undefined) {
    next.creditIncreaseThreshold = Number(body.creditIncreaseThreshold);
  }
  if (body.digestFrequency !== undefined) next.digestFrequency = String(body.digestFrequency);
  if (body.digestTimeOfDay !== undefined) next.digestTimeOfDay = String(body.digestTimeOfDay);
  if (body.digestWeekday !== undefined) next.digestWeekday = Number(body.digestWeekday);
  if (body.timeZone !== undefined) next.timeZone = String(body.timeZone || 'Africa/Cairo');
  return next;
}

async function get(req, res, next) {
  try {
    const settings = await alertSettingsRepository.getByClientId(req.client.id);
    if (!settings) throw httpError(404, 'NOT_FOUND', 'إعدادات العميل غير موجودة');
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const current = await alertSettingsRepository.getByClientId(req.client.id);
    if (!current) throw httpError(404, 'NOT_FOUND', 'إعدادات العميل غير موجودة');

    const nextSettings = validateSettings(mergeSettings(current, req.body || {}));
    const saved = await alertSettingsRepository.upsert(req.client.id, nextSettings);
    res.json(saved);
  } catch (err) {
    next(err);
  }
}

module.exports = { get, update, __test: { validateSettings, mergeSettings } };
