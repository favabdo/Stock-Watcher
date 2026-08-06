const clientPoolManager = require('./clientPoolManager');
const creditLimitRepository = require('../repositories/creditLimitRepository');
const whatsappService = require('./whatsappService');
const creditAlertsRepository = require('../repositories/creditAlertsRepository');

const MAX_LINES_IN_MESSAGE = 30;

// قالب واتساب مخصص لتنبيهات الحد الائتماني ("التيمبلت الجديد") - لو مش
// متحطوط في الـ environment، sendWhatsappMessage(To Many) بترجع تستخدم
// القالب العام الافتراضي بتاع الاستوك تلقائيًا.
function creditWhatsappOptions() {
  return {
    templateName: process.env.WHATSAPP_CREDIT_TEMPLATE_NAME,
    templateLang: process.env.WHATSAPP_CREDIT_TEMPLATE_LANG,
    hasVariable:
      process.env.WHATSAPP_CREDIT_TEMPLATE_HAS_VARIABLE !== undefined
        ? process.env.WHATSAPP_CREDIT_TEMPLATE_HAS_VARIABLE !== 'false'
        : undefined,
  };
}

// رسالة مجمعة لكل الحالات مع بعضها - للفحص اليدوي الكامل (زرار "تحقق الآن").
function buildSummaryMessage(clientName, overLimit) {
  const parts = [];
  parts.push(`تنبيه تجاوز الحد الائتماني - ${clientName}.`);
  parts.push(`فيه ${overLimit.length} حالة تجاوزت الحد الائتماني:`);

  overLimit.slice(0, MAX_LINES_IN_MESSAGE).forEach((row, i) => {
    const name = row.customerName || row.customerCode || row.customerId;
    const branchPart = row.branchName || row.branchId ? ` - فرع ${row.branchName || row.branchId}` : '';
    const lastPaidPart = row.lastPaidAmount ? ` (آخر دفعة ${row.lastPaidAmount} بتاريخ ${row.lastPaidDate || '-'})` : '';
    parts.push(
      `${i + 1}) ${row.customerCode || row.customerId} - ${name}${branchPart}: الرصيد ${row.balance} (الحد ${row.creditLimit}، تجاوز بـ ${row.overAmount})${lastPaidPart}.`
    );
  });

  if (overLimit.length > MAX_LINES_IN_MESSAGE) {
    parts.push(`و ${overLimit.length - MAX_LINES_IN_MESSAGE} حالة تانية.`);
  }

  return parts.join(' ');
}

// رسالة لعميل (شخص) واحد بس، مع كل الفروع اللي تجاوز فيها الحد - دي اللي
// بتتبعت في الفحص التلقائي المجدول لكل حالة جديدة لوحدها.
function buildSingleCustomerMessage(clientName, customerGroup) {
  const name = customerGroup.customerName || customerGroup.customerCode || customerGroup.customerId;
  const parts = [];
  parts.push(`تنبيه تجاوز الحد الائتماني - ${clientName}.`);
  parts.push(`العميل ${customerGroup.customerCode || customerGroup.customerId} - ${name} تجاوز الحد الائتماني في ${customerGroup.branches.length} فرع:`);

  customerGroup.branches.slice(0, MAX_LINES_IN_MESSAGE).forEach((b, i) => {
    const branchPart = b.branchName || b.branchId ? `فرع ${b.branchName || b.branchId}: ` : '';
    const lastPaidPart = b.lastPaidAmount ? ` (آخر دفعة ${b.lastPaidAmount} بتاريخ ${b.lastPaidDate || '-'})` : '';
    parts.push(`${i + 1}) ${branchPart}الرصيد ${b.balance} (الحد ${b.creditLimit}، تجاوز بـ ${b.overAmount})${lastPaidPart}.`);
  });

  if (customerGroup.branches.length > MAX_LINES_IN_MESSAGE) {
    parts.push(`و ${customerGroup.branches.length - MAX_LINES_IN_MESSAGE} فرع تاني.`);
  }

  return parts.join(' ');
}

// بيجمع صفوف (عميل × فرع) المسطحة لمجموعات لكل عميل لوحده - عشان كل عميل
// ياخد رسالة واتساب منفصلة في الفحص التلقائي.
function groupRowsByCustomer(rows) {
  const byCustomer = new Map();
  for (const row of rows) {
    if (!byCustomer.has(row.customerId)) {
      byCustomer.set(row.customerId, {
        customerId: row.customerId,
        customerCode: row.customerCode,
        customerName: row.customerName,
        branches: [],
      });
    }
    byCustomer.get(row.customerId).branches.push(row);
  }
  return [...byCustomer.values()];
}

// بيفحص كل العملاء (الأشخاص) اللي تجاوزوا الحد الائتماني، عن طريق نداء واحد
// لـ Stp_sh_Customerbalances_overcreditlimit بتاريخ اليوم دايمًا، وفاضي
// ('', '') = كل الفروع وكل مجموعات العملاء (زي بالظبط exec ... 20260801, '', '').
//
// معيار "متجاوز": overAmount > 0 (الرصيد أعلى من الحد الائتماني).
async function checkAllCustomersOverCreditLimit(pool, { branchId = '', customerGroupId = '' } = {}) {
  const rows = await creditLimitRepository.runOverCreditLimit(pool, { branchId, customerGroupId });
  return rows.filter((r) => Number(r.overAmount) > 0);
}

// نفس فكرة multiClientCheckService.runCheckForClient بالظبط، بس لتنبيهات
// تجاوز الحد الائتماني - onlyNewAlerts بنفس المعنى (الفحص التلقائي المجدول
// بيبعت تنبيه بس عن الحالات الجديدة، الفحص اليدوي بيبعت ملخص كل الحالات).
async function runCreditCheckForClient(clientConnectionConfig, { onlyNewAlerts = false } = {}) {
  const pool = await clientPoolManager.getPoolForClient(clientConnectionConfig);
  const overLimit = await checkAllCustomersOverCreditLimit(pool);

  let itemsToNotify = overLimit;
  let newAlertsCount = null;

  if (onlyNewAlerts) {
    const { newAlerts, resolvedCount } = await creditAlertsRepository.syncAlerts(
      clientConnectionConfig.id,
      overLimit
    );
    itemsToNotify = newAlerts;
    newAlertsCount = newAlerts.length;
    if (resolvedCount > 0) {
      console.log(
        `[CreditCheck] العميل "${clientConnectionConfig.clientName}": ${resolvedCount} حالة رجعت تحت الحد الائتماني.`
      );
    }
  }

  const whatsappResults = [];
  const wOptions = creditWhatsappOptions();

  if (itemsToNotify.length > 0) {
    if (onlyNewAlerts) {
      const customerGroups = groupRowsByCustomer(itemsToNotify);
      for (const customerGroup of customerGroups) {
        const message = buildSingleCustomerMessage(clientConnectionConfig.clientName, customerGroup);
        try {
          const result = await whatsappService.sendWhatsappMessageToMany(
            clientConnectionConfig.whatsappPhones,
            message,
            wOptions
          );
          whatsappResults.push({ customerId: customerGroup.customerId, code: customerGroup.customerCode, ...result });
          console.log(
            `[CreditCheck] اتبعتت رسالة واتساب منفصلة للعميل "${customerGroup.customerCode || customerGroup.customerId}" للتينانت "${clientConnectionConfig.clientName}" (${customerGroup.branches.length} فرع).`
          );
        } catch (err) {
          whatsappResults.push({ customerId: customerGroup.customerId, code: customerGroup.customerCode, sent: false, error: err.message });
          console.error(
            `[CreditCheck] فشل إرسال واتساب للعميل "${customerGroup.customerCode || customerGroup.customerId}" للتينانت "${clientConnectionConfig.clientName}":`,
            err.message
          );
        }
      }
    } else {
      const message = buildSummaryMessage(clientConnectionConfig.clientName, itemsToNotify);
      try {
        const result = await whatsappService.sendWhatsappMessageToMany(
          clientConnectionConfig.whatsappPhones,
          message,
          wOptions
        );
        whatsappResults.push(result);
        console.log(
          `[CreditCheck] اتبعتت رسالة واتساب مجمعة للتينانت "${clientConnectionConfig.clientName}" (${itemsToNotify.length} حالة)`
        );
      } catch (err) {
        whatsappResults.push({ sent: false, error: err.message });
        console.error(`[CreditCheck] فشل إرسال واتساب للتينانت "${clientConnectionConfig.clientName}":`, err.message);
      }
    }
  }

  return {
    clientId: clientConnectionConfig.id,
    clientName: clientConnectionConfig.clientName,
    overLimitCount: overLimit.length,
    overLimit,
    newAlertsCount,
    whatsapp: whatsappResults,
  };
}

module.exports = { checkAllCustomersOverCreditLimit, runCreditCheckForClient };
