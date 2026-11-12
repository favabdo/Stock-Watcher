const { sql, getPool } = require('../config/db');

async function insertRun(data) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientId', sql.Int, data.clientId);
  request.input('reportId', sql.NVarChar(80), data.reportId);
  request.input('paramsJson', sql.NVarChar(sql.MAX), data.params ? JSON.stringify(data.params) : null);
  request.input('format', sql.NVarChar(8), data.format || 'json');
  request.input('rowCount', sql.Int, data.rowCount ?? null);
  request.input('durationMs', sql.Int, data.durationMs ?? null);
  request.input('status', sql.NVarChar(12), data.status);
  request.input('errorCode', sql.NVarChar(80), data.errorCode || null);
  await request.query(`
    INSERT INTO dbo.StockWatcherReportRuns_byA
      (ClientId, ReportId, ParamsJson, Format, RowsReturned, DurationMs, Status, ErrorCode)
    VALUES
      (@clientId, @reportId, @paramsJson, @format, @rowCount, @durationMs, @status, @errorCode)
  `);
}

module.exports = { insertRun };
