const creditLimitCheckService = require('../services/creditLimitCheckService');
const { getClientPoolAndConfig } = require('./itemsController');

// كل العملاء (الأشخاص) اللي تجاوزوا الحد الائتماني في أي فرع بتاعة العميل
// المسجل دخول حاليًا بس، مجمّعة حسب العميل. ده اللي بيتعرض في الصفحة
// الرئيسية زي "الأصناف التي بلغت حد إعادة الطلب" بالظبط.
async function getOverCreditLimit(req, res, next) {
  try {
    if (!req.client.alertCreditLimitEnabled) {
      return res.json([]); // الميزة متعطلة لهذا العميل - نرجع لستة فاضية بهدوء
    }

    const { pool } = await getClientPoolAndConfig(req);
    const rows = await creditLimitCheckService.checkAllCustomersOverCreditLimit(pool);

    const byCustomer = new Map();
    for (const row of rows) {
      if (!byCustomer.has(row.customerId)) {
        byCustomer.set(row.customerId, {
          customer: {
            id: row.customerId,
            code: row.customerCode,
            name: row.customerName,
          },
          branches: [],
        });
      }
      byCustomer.get(row.customerId).branches.push({
        branchId: row.branchId,
        branchName: row.branchName,
        balance: row.balance,
        creditLimit: row.creditLimit,
        overAmount: row.overAmount,
        lastPaidAmount: row.lastPaidAmount,
        lastPaidDate: row.lastPaidDate,
      });
    }

    res.json(Array.from(byCustomer.values()));
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverCreditLimit };
