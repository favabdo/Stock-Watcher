const { sql } = require('../config/db');

// بيرجّع تاريخ اليوم بصيغة YYYYMMDD (رقم صحيح)، زي ما البروسيدر بيستنى
// @TDate بالظبط (مثال: exec ... 20260801, '', ''). دايمًا بيتحسب لحظة
// النداء نفسه، فمفيش حاجة اسمها تاريخ "متسجل" أو قديم - كل فحص بياخد تاريخ
// اليوم الحالي وقت التشغيل.
function getTodayYyyymmdd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return Number(`${y}${m}${d}`);
}

// بيدور جوه الصف على أول عمود من مجموعة أسماء محتملة (case-insensitive) -
// عشان مش عارفين بالظبط أسماء الأعمدة اللي هترجع من
// Stp_sh_Customerbalances_overcreditlimit، فبدل ما نفترض اسم ثابت وممكن
// يبوظ لو مختلف، بنجرب أكتر من اسم شائع. لو التسمية الفعلية مختلفة عن كل
// المرشحين دول، ضيف اسم العمود الصح في المصفوفة المناسبة تحت.
function pickField(row, candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find((k) => k.toLowerCase() === candidate.toLowerCase());
    if (found !== undefined && row[found] !== undefined && row[found] !== null) {
      return row[found];
    }
  }
  return null;
}

// الأعمدة دي مؤكدة فعليًا من نتيجة تنفيذ البروسيدر (مش تخمين):
//   Customercode, CustomerId, CustomerName_Ar, Clientbal, BranchID,
//   Chekval, CreditLimit, lastepaid, datepaid
// Chekval مش مستخدم في حساب التجاوز (مش واضح معناه بالظبط ومش مطلوب لمنطق
// التنبيه) - لو ظهر إنه محتاج يتلاقى معنى تاني لاحقًا يقدر يتضاف بسهولة.
const FIELD_CANDIDATES = {
  customerId: ['customerid', 'custid', 'customer_id'],
  customerCode: ['customercode', 'custcode', 'customer_code', 'code'],
  customerName: ['customername_ar', 'customername', 'custname', 'customer_name', 'name_ar', 'name'],
  creditLimit: ['creditlimit', 'credit_limit', 'creditlimt'],
  balance: ['clientbal', 'currentbalance', 'balance', 'custbalance', 'totalbalance', 'balancenow'],
  overAmount: [
    'overcreditamount', 'overamount', 'overlimit', 'overcreditlimit',
    'livecreditamount', 'excessamount', 'diffamount',
  ],
  branchId: ['branchid', 'branch_id'],
  branchName: ['branchname', 'branch_name'],
  groupId: ['customergroupid', 'groupid', 'group_id'],
  lastPaidAmount: ['lastepaid', 'lastpaid', 'last_paid_amount'],
  lastPaidDate: ['datepaid', 'lastpaiddate', 'last_paid_date'],
};

function mapRow(row) {
  const customerId = pickField(row, FIELD_CANDIDATES.customerId);
  const branchId = pickField(row, FIELD_CANDIDATES.branchId);
  const creditLimit = Number(pickField(row, FIELD_CANDIDATES.creditLimit)) || 0;
  const balance = Number(pickField(row, FIELD_CANDIDATES.balance)) || 0;
  const overAmountRaw = pickField(row, FIELD_CANDIDATES.overAmount);
  // لو مفيش عمود جاهز بالفرق، بنحسبه إحنا من الرصيد - الحد (بنفس منطق
  // liveReorderQty بتاع الاستوك: قيمة موجبة = تجاوز فعلي).
  const overAmount = overAmountRaw !== null ? Number(overAmountRaw) : balance - creditLimit;

  return {
    customerId,
    customerCode: pickField(row, FIELD_CANDIDATES.customerCode),
    customerName: pickField(row, FIELD_CANDIDATES.customerName),
    creditLimit,
    balance,
    overAmount,
    branchId,
    branchName: pickField(row, FIELD_CANDIDATES.branchName),
    groupId: pickField(row, FIELD_CANDIDATES.groupId),
    lastPaidAmount: pickField(row, FIELD_CANDIDATES.lastPaidAmount),
    lastPaidDate: pickField(row, FIELD_CANDIDATES.lastPaidDate),
    _raw: row, // محتفظين بالصف الخام للتشخيص لو الأعمدة مش متطابقة مع المتوقع
  };
}

// بيشغل exec Stp_sh_Customerbalances_overcreditlimit @TDate, @Branchid,
// @customergroupid بالظبط زي ما بيتنفذ يدويًا (تاريخ اليوم دايمًا، وفاضي
// '' = كل الفروع/كل المجموعات لو مش محدد فرع أو مجموعة بعينها).
async function runOverCreditLimit(pool, { branchId = '', customerGroupId = '' } = {}) {
  const request = pool.request();
  request.input('TDate', sql.Int, getTodayYyyymmdd());
  request.input('Branchid', sql.NVarChar(50), branchId ?? '');
  request.input('customergroupid', sql.NVarChar(50), customerGroupId ?? '');

  const result = await request.execute('dbo.Stp_sh_Customerbalances_overcreditlimit');
  const rows = result.recordset || [];
  return rows.map(mapRow);
}

module.exports = { runOverCreditLimit, getTodayYyyymmdd };
