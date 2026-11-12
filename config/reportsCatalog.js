// كتالوج التقارير: SQL/بروسيدر ثابت في الكود، والمعاملات الوحيدة المسموحة
// هي المعلنة هنا. لا يصل أي SQL من العميل إلى قاعدة البيانات.
//
// كل تقرير له:
//   mode: 'proc' | 'query'
//   staticInputs: قيم ثابتة/ديناميكية (مثل تاريخ اليوم)
//   params: معاملات المستخدم مع inputKey لو اسم بارامتر البروسيدر مختلف
//   filter/mapRow: تحويل الصفوف لشكل موحد
//   columns/totals: لوصف الجدول والتصدير
//   crystal: ربط بتقرير Crystal الأصلي (يُكمل بعد جرد التقارير)

const creditLimitRepository = require('../repositories/creditLimitRepository');

const TODAY = 'TODAY_YYYYMMDD';

const INT = 'int';
const BIGINT = 'bigint';
const NVARCHAR = 'nvarchar';
const YYYYMMDD = 'yyyymmdd';

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const reports = [
  {
    id: 'low_stock',
    nameAr: 'الأصناف تحت حد إعادة الطلب',
    groupAr: 'المخزون',
    descriptionAr: 'كل صف يمثل صنفًا في مخزن وصل رصيده لحد إعادة الطلب أو أقل.',
    delivery: 'native',
    mode: 'proc',
    proc: 'dbo.wh_ItemStockWatcherNew',
    staticInputs: [
      { key: 'isReorder', type: INT, value: 1 },
      { key: 'itemid', type: BIGINT, value: null },
      { key: 'storeid', type: INT, value: null },
      { key: 'groupid', type: INT, value: null },
      { key: 'subgroupid', type: INT, value: null },
      { key: 'supplierid', type: INT, value: null },
      { key: 'tdate', type: INT, value: null },
      { key: 'branchid', type: INT, value: null },
    ],
    params: [],
    filter: (row) => num(row.liveReorderQty) >= 0,
    mapRow: (row) => ({
      itemCode: row.itemcode,
      itemName: row.itemname,
      storeId: row.storeid,
      storeName: row.storename,
      stock: num(row.transpkgqty1),
      reorderQty: num(row.ReorderQty),
      liveReorderQty: num(row.liveReorderQty),
    }),
    columns: [
      { key: 'itemCode', labelAr: 'كود الصنف', type: 'string', align: 'start' },
      { key: 'itemName', labelAr: 'اسم الصنف', type: 'string', align: 'start' },
      { key: 'storeName', labelAr: 'المخزن', type: 'string', align: 'start' },
      { key: 'stock', labelAr: 'الرصيد', type: 'number', align: 'end' },
      { key: 'reorderQty', labelAr: 'حد إعادة الطلب', type: 'number', align: 'end' },
      { key: 'liveReorderQty', labelAr: 'الفرق عن الحد', type: 'number', align: 'end' },
    ],
    totals: [],
    rowLimit: 2000,
    timeoutMs: 20000,
    crystal: { rpt: null, mapped: false },
  },
  {
    id: 'credit_over_limit',
    nameAr: 'العملاء المتجاوزون الحد الائتماني',
    groupAr: 'الائتمان',
    descriptionAr: 'أرصدة العملاء التي تجاوزت الحد الائتماني، مع مقدار التجاوز وآخر دفعة.',
    delivery: 'native',
    mode: 'proc',
    proc: 'dbo.Stp_sh_Customerbalances_overcreditlimit',
    staticInputs: [
      { key: 'TDate', type: YYYYMMDD, value: TODAY },
      { key: 'Branchid', type: NVARCHAR, value: '' },
      { key: 'customergroupid', type: NVARCHAR, value: '' },
    ],
    params: [
      {
        key: 'branchId',
        inputKey: 'Branchid',
        labelAr: 'الفرع',
        type: 'nvarchar',
        required: false,
        widget: 'text',
        placeholder: 'اتركه فارغًا لكل الفروع',
      },
    ],
    filter: (row) => num(row.overAmount) > 0,
    mapRow: (row) => {
      const mapped = creditLimitRepository.mapRow(row);
      return {
        customerCode: mapped.customerCode,
        customerName: mapped.customerName,
        branchName: mapped.branchName || mapped.branchId || '',
        creditLimit: num(mapped.creditLimit),
        balance: num(mapped.balance),
        overAmount: num(mapped.overAmount),
        lastPaidAmount: mapped.lastPaidAmount == null ? null : num(mapped.lastPaidAmount),
        lastPaidDate: mapped.lastPaidDate || null,
      };
    },
    columns: [
      { key: 'customerCode', labelAr: 'كود العميل', type: 'string', align: 'start' },
      { key: 'customerName', labelAr: 'اسم العميل', type: 'string', align: 'start' },
      { key: 'branchName', labelAr: 'الفرع', type: 'string', align: 'start' },
      { key: 'creditLimit', labelAr: 'الحد الائتماني', type: 'decimal', align: 'end' },
      { key: 'balance', labelAr: 'الرصيد', type: 'decimal', align: 'end' },
      { key: 'overAmount', labelAr: 'مقدار التجاوز', type: 'decimal', align: 'end' },
      { key: 'lastPaidAmount', labelAr: 'آخر دفعة', type: 'decimal', align: 'end' },
      { key: 'lastPaidDate', labelAr: 'تاريخ آخر دفعة', type: 'date', align: 'end' },
    ],
    totals: [
      { key: 'balance', agg: 'sum', labelAr: 'إجمالي الأرصدة' },
      { key: 'overAmount', agg: 'sum', labelAr: 'إجمالي التجاوز' },
    ],
    rowLimit: 2000,
    timeoutMs: 20000,
    crystal: { rpt: null, mapped: false },
  },
  {
    id: 'item_stock_by_store',
    nameAr: 'رصيد صنف في المخازن',
    groupAr: 'المخزون',
    descriptionAr: 'كل مخازن صنف واحد مع الرصيد وحد إعادة الطلب وحالة كل مخزن.',
    delivery: 'native',
    mode: 'proc',
    proc: 'dbo.wh_ItemStockWatcherNew',
    staticInputs: [
      { key: 'isReorder', type: INT, value: 0 },
      { key: 'storeid', type: INT, value: null },
      { key: 'groupid', type: INT, value: null },
      { key: 'subgroupid', type: INT, value: null },
      { key: 'supplierid', type: INT, value: null },
      { key: 'tdate', type: INT, value: null },
      { key: 'branchid', type: INT, value: null },
    ],
    params: [
      {
        key: 'itemId',
        inputKey: 'itemid',
        labelAr: 'كود الصنف الداخلي (ID)',
        type: 'bigint',
        required: true,
        widget: 'number',
        placeholder: 'مثال: 1024',
      },
    ],
    filter: null,
    mapRow: (row) => ({
      itemCode: row.itemcode,
      itemName: row.itemname,
      storeId: row.storeid,
      storeName: row.storename,
      stock: num(row.transpkgqty1),
      reorderQty: num(row.ReorderQty),
      liveReorderQty: num(row.liveReorderQty),
      belowThreshold: num(row.liveReorderQty) >= 0,
    }),
    columns: [
      { key: 'itemCode', labelAr: 'كود الصنف', type: 'string', align: 'start' },
      { key: 'itemName', labelAr: 'اسم الصنف', type: 'string', align: 'start' },
      { key: 'storeName', labelAr: 'المخزن', type: 'string', align: 'start' },
      { key: 'stock', labelAr: 'الرصيد', type: 'number', align: 'end' },
      { key: 'reorderQty', labelAr: 'حد إعادة الطلب', type: 'number', align: 'end' },
      { key: 'belowThreshold', labelAr: 'تحت الحد', type: 'boolean', align: 'end' },
    ],
    totals: [],
    rowLimit: 1000,
    timeoutMs: 20000,
    crystal: { rpt: null, mapped: false },
  },
];

function getReportById(id) {
  return reports.find((report) => report.id === id) || null;
}

function listReports() {
  return reports;
}

module.exports = { getReportById, listReports, TODAY };
