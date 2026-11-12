// تصدير XLSX على السيرفر (يدعم RTL). PDF يتم توليده على جهاز الموبايل
// بخط Cairo المضمّن لضمان تشكيل عربي سليم.
async function buildXlsx(report, result) {
  let ExcelJS;
  try {
    ExcelJS = require('exceljs');
  } catch (err) {
    const error = new Error('مكتبة exceljs غير مثبتة على السيرفر');
    error.status = 500;
    throw error;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Stock Watcher';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(report.nameAr.slice(0, 30), {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = report.columns.map((column) => ({
    header: column.labelAr,
    key: column.key,
    width: column.type === 'string' ? 28 : 18,
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245493' } };
  header.alignment = { horizontal: 'center', vertical: 'middle' };
  header.height = 24;

  for (const row of result.rows) {
    const values = {};
    for (const column of report.columns) {
      const value = row[column.key];
      values[column.key] = column.type === 'boolean' ? (value ? 'نعم' : 'لا') : value;
    }
    sheet.addRow(values);
  }

  if (result.totals) {
    const totalsRow = {};
    totalsRow[report.columns[0].key] = 'الإجمالي';
    for (const column of report.columns) {
      if (result.totals[column.key] !== undefined) totalsRow[column.key] = result.totals[column.key];
    }
    const row = sheet.addRow(totalsRow);
    row.font = { bold: true };
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'middle' };
  });

  return workbook.xlsx.writeBuffer();
}

module.exports = { buildXlsx };
