const test = require('node:test');
const assert = require('node:assert/strict');

const { computeReorderSuggestion } = require('../services/reorderSuggestionService');
const { generateRefreshToken, hashRefreshToken } = require('../utils/refreshToken');
const { validateParams } = require('../utils/reportParams');
const { isDigestDue, zonedParts } = require('../utils/digestSchedule');

test('reorder suggestion uses MaxQty first', () => {
  assert.equal(computeReorderSuggestion({ stock: 3, reorderQty: 5, minQty: 2, maxQty: 20 }), 17);
});

test('reorder suggestion falls back to twice reorder when MaxQty is zero', () => {
  assert.equal(computeReorderSuggestion({ stock: 4, reorderQty: 10, minQty: 0, maxQty: 0 }), 16);
});

test('reorder suggestion never returns a negative quantity', () => {
  assert.equal(computeReorderSuggestion({ stock: 50, reorderQty: 5, minQty: 0, maxQty: 20 }), 0);
});

test('refresh token hashes deterministically to 64 hex chars', () => {
  const token = generateRefreshToken();
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.equal(hashRefreshToken(token), hashRefreshToken(token));
  assert.match(hashRefreshToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashRefreshToken(token), hashRefreshToken(generateRefreshToken()));
});

const fakeReport = {
  params: [
    { key: 'itemId', labelAr: 'الصنف', type: 'bigint', required: true },
    { key: 'branchId', labelAr: 'الفرع', type: 'nvarchar', required: false },
    { key: 'threshold', labelAr: 'الحد', type: 'decimal', required: false },
  ],
};

test('report params reject unknown keys', () => {
  assert.throws(() => validateParams(fakeReport, { sql: 'DROP TABLE x' }), (err) => {
    assert.equal(err.status, 422);
    assert.equal(err.code, 'VALIDATION_ERROR');
    return true;
  });
});

test('report params require required values', () => {
  assert.throws(() => validateParams(fakeReport, {}), (err) => err.status === 422);
});

test('report params convert known values', () => {
  const values = validateParams(fakeReport, { itemId: '1024', branchId: '3', threshold: '12.5' });
  assert.equal(values.itemId, 1024);
  assert.equal(values.branchId, '3');
  assert.equal(values.threshold, 12.5);
});

test('digest schedule matches Cairo 08:00 daily', () => {
  const now = new Date('2026-11-08T06:00:00Z'); // 08:00 Africa/Cairo (UTC+2)
  const parts = zonedParts(now, 'Africa/Cairo');
  assert.equal(parts.minutes, 8 * 60);

  assert.equal(
    isDigestDue(
      { digestEnabled: true, digestFrequency: 'daily', digestTimeOfDay: '08:00', timeZone: 'Africa/Cairo' },
      now
    ),
    true
  );
  assert.equal(
    isDigestDue(
      { digestEnabled: true, digestFrequency: 'daily', digestTimeOfDay: '09:00', timeZone: 'Africa/Cairo' },
      now
    ),
    false
  );
});

test('weekly digest only fires on the configured weekday', () => {
  const sunday = new Date('2026-11-08T06:00:00Z');
  const settings = {
    digestEnabled: true,
    digestFrequency: 'weekly',
    digestTimeOfDay: '08:00',
    digestWeekday: 0,
    timeZone: 'Africa/Cairo',
  };
  assert.equal(isDigestDue(settings, sunday), true);
  assert.equal(isDigestDue({ ...settings, digestWeekday: 1 }, sunday), false);
});
