const { httpError } = require('./apiError');

function convertValue(param, raw) {
  if (raw === null || raw === undefined || raw === '') {
    if (param.required) {
      throw httpError(422, 'VALIDATION_ERROR', `القيمة "${param.labelAr || param.key}" مطلوبة`);
    }
    return null;
  }

  if (param.type === 'int' || param.type === 'bigint' || param.type === 'yyyymmdd') {
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      throw httpError(422, 'VALIDATION_ERROR', `القيمة "${param.labelAr || param.key}" لازم تكون رقمًا صحيحًا`);
    }
    return n;
  }

  if (param.type === 'decimal') {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw httpError(422, 'VALIDATION_ERROR', `القيمة "${param.labelAr || param.key}" لازم تكون رقمًا`);
    }
    return n;
  }

  if (param.type === 'boolean' || param.type === 'bit') {
    return raw === true || raw === 1 || raw === '1' || raw === 'true';
  }

  return String(raw);
}

// يتحقق من أن كل المفاتيح المرسلة معروفة، ويحوّل القيم حسب تعريف التقرير.
function validateParams(report, input = {}) {
  const provided = input && typeof input === 'object' ? input : {};
  const known = new Map(report.params.map((p) => [p.key, p]));

  for (const key of Object.keys(provided)) {
    if (!known.has(key)) {
      throw httpError(422, 'VALIDATION_ERROR', `المعامل "${key}" غير معروف لهذا التقرير`);
    }
  }

  const values = {};
  for (const param of report.params) {
    values[param.key] = convertValue(param, provided[param.key]);
  }
  return values;
}

module.exports = { validateParams, convertValue };
