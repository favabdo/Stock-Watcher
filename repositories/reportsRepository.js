const { sql } = require('../config/db');
const { getTodayYyyymmdd } = require('./creditLimitRepository');
const { TODAY } = require('../config/reportsCatalog');
const { validateParams, convertValue } = require('../utils/reportParams');

const SQL_TYPES = {
  int: (v) => [sql.Int, v],
  bigint: (v) => [sql.BigInt, v],
  nvarchar: (v) => [sql.NVarChar(100), v],
  yyyymmdd: (v) => [sql.Int, v],
  bit: (v) => [sql.Bit, v],
  decimal: (v) => [sql.Decimal(18, 2), v],
};

function resolveStaticValue(input) {
  if (input.value === TODAY) return getTodayYyyymmdd();
  return input.value;
}

async function runReport(pool, report, params, { maxRows, timeoutMs } = {}) {
  const request = pool.request();
  request.timeout = Number(timeoutMs || report.timeoutMs || 20000);
  const bindings = new Map();

  for (const input of report.staticInputs || []) {
    bindings.set(input.key, { type: input.type, value: resolveStaticValue(input) });
  }

  for (const param of report.params) {
    const inputKey = param.inputKey || param.key;
    bindings.set(inputKey, { type: param.type, value: params[param.key] });
  }

  const assignments = [];
  for (const [key, binding] of bindings) {
    const typer = SQL_TYPES[binding.type];
    if (!typer) throw new Error(`نوع معامل غير معروف: ${binding.type}`);
    const [sqlType, value] = typer(binding.value);
    request.input(key, sqlType, value);
    assignments.push(`${key} = @${key}`);
  }

  let text;
  if (report.mode === 'proc') {
    text = `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\nEXEC ${report.proc} ${assignments.join(', ')};`;
  } else {
    text = `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\n${report.sql}`;
  }

  const result = await request.query(text);
  const rawRows = result.recordset || [];

  const mapped = [];
  for (const row of rawRows) {
    if (report.filter && !report.filter(row)) continue;
    mapped.push(report.mapRow ? report.mapRow(row) : row);
  }

  const limit = Number(maxRows || report.rowLimit || 2000);
  return {
    rows: mapped.slice(0, limit),
    truncated: mapped.length > limit,
    totalBeforeLimit: mapped.length,
  };
}

module.exports = { validateParams, runReport, convertValue };
