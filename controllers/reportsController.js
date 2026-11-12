const reportsService = require('../services/reportsService');
const { buildXlsx } = require('../services/reportExportService');

function list(req, res) {
  res.json(reportsService.getCatalog());
}

async function run(req, res, next) {
  try {
    const result = await reportsService.run(
      req.client.id,
      req.params.id,
      req.body?.params || {},
      { format: 'json' }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function exportReport(req, res, next) {
  try {
    const result = await reportsService.run(
      req.client.id,
      req.params.id,
      req.body?.params || {},
      { format: 'xlsx' }
    );
    const buffer = await buildXlsx(result.report, result);
    const filename = `${result.report.id}-${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, run, exportReport };
