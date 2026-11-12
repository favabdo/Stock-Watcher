const clientsRepository = require('../repositories/clientsRepository');
const clientPoolManager = require('./clientPoolManager');
const { getReportById, listReports } = require('../config/reportsCatalog');
const { validateParams, runReport } = require('../repositories/reportsRepository');
const reportRunsRepository = require('../repositories/reportRunsRepository');
const { httpError } = require('../utils/apiError');

function describeReport(report) {
  return {
    id: report.id,
    nameAr: report.nameAr,
    groupAr: report.groupAr,
    descriptionAr: report.descriptionAr,
    delivery: report.delivery,
    formats: report.delivery === 'native' ? ['json', 'xlsx'] : ['external'],
    params: report.params.map((p) => ({
      key: p.key,
      labelAr: p.labelAr,
      type: p.type,
      required: !!p.required,
      widget: p.widget || 'text',
      placeholder: p.placeholder || null,
    })),
    columns: report.columns,
    supportsTotals: (report.totals || []).length > 0,
    crystal: report.crystal || { rpt: null, mapped: false },
  };
}

function getCatalog() {
  return listReports()
    .filter((report) => report.delivery === 'native')
    .map(describeReport);
}

function calculateTotals(report, rows, truncated) {
  if (!report.totals || report.totals.length === 0) return null;
  // مجموع ناقص أخطر من عدم وجود مجموع.
  if (truncated) return null;

  const totals = {};
  for (const total of report.totals) {
    let sum = 0;
    for (const row of rows) sum += Number(row[total.key]) || 0;
    totals[total.key] = Math.round(sum * 100) / 100;
  }
  return totals;
}

async function getTenantPool(clientId) {
  const config = await clientsRepository.getClientConnectionConfig(clientId);
  if (!config || !config.isActive) {
    throw httpError(404, 'CLIENT_NOT_FOUND', 'العميل غير موجود أو متوقف');
  }
  const pool = await clientPoolManager.getPoolForClient(config);
  return { pool, config };
}

async function run(clientId, reportId, inputParams = {}, { format = 'json' } = {}) {
  const report = getReportById(reportId);
  if (!report || report.delivery !== 'native') {
    throw httpError(404, 'REPORT_NOT_FOUND', 'التقرير غير موجود');
  }

  const params = validateParams(report, inputParams);
  const { pool } = await getTenantPool(clientId);
  const startedAt = Date.now();

  try {
    const result = await runReport(pool, report, params, {
      maxRows: Number(process.env.REPORT_MAX_ROWS) || report.rowLimit,
      timeoutMs: Number(process.env.REPORT_TIMEOUT_MS) || report.timeoutMs,
    });

    const totals = calculateTotals(report, result.rows, result.truncated);
    const durationMs = Date.now() - startedAt;

    await reportRunsRepository.insertRun({
      clientId,
      reportId: report.id,
      params,
      format,
      rowCount: result.rows.length,
      durationMs,
      status: 'ok',
    });

    return {
      report: describeReport(report),
      generatedAt: new Date().toISOString(),
      params,
      columns: report.columns,
      rows: result.rows,
      totals,
      totalsTruncated: !!report.totals?.length && result.truncated,
      rowCount: result.rows.length,
      truncated: result.truncated,
      durationMs,
    };
  } catch (err) {
    const isTimeout = /timeout|ETIMEOUT|Timeout/i.test(err.message || '');
    await reportRunsRepository
      .insertRun({
        clientId,
        reportId: report.id,
        params,
        format,
        status: isTimeout ? 'timeout' : 'error',
        errorCode: isTimeout ? 'REPORT_TIMEOUT' : 'REPORT_FAILED',
        durationMs: Date.now() - startedAt,
      })
      .catch(() => {});

    if (isTimeout) {
      throw httpError(504, 'REPORT_TIMEOUT', 'التقرير استغرق وقتًا أطول من المسموح. جرّب تضييق المعاملات.');
    }
    throw err;
  }
}

module.exports = { getCatalog, run, describeReport };
