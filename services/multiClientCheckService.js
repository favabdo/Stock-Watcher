const clientPoolManager = require('./clientPoolManager');
const branchRepository = require('../repositories/branchRepository');
const stockRepository = require('../repositories/stockRepository');
const itemsRepository = require('../repositories/itemsRepository');
const whatsappService = require('./whatsappService');

const MAX_LINES_IN_MESSAGE = 30;

function buildWhatsappMessage(clientName, belowThreshold) {
  const lines = [];
  lines.push(`⚠️ تنبيه Stock Watcher - ${clientName}`);
  lines.push(`فيه ${belowThreshold.length} حالة وصلت لحد إعادة الطلب أو أقل منه:`);
  lines.push('');

  belowThreshold.slice(0, MAX_LINES_IN_MESSAGE).forEach((entry, i) => {
    const { item, branchID, row } = entry;
    const name = item.Name_Ar || item.Name_En || item.Code;
    lines.push(`${i + 1}) ${item.Code} - ${name} | فرع ${branchID}: الاستوك ${row.Stock} (الحد ${item.ReorderQty})`);
  });

  if (belowThreshold.length > MAX_LINES_IN_MESSAGE) {
    lines.push(`... و ${belowThreshold.length - MAX_LINES_IN_MESSAGE} حالة تانية`);
  }

  return lines.join('\n');
}

// بيفحص كل الأصناف اللي ليها ReorderQty في كل الفروع (مش صنف واحد بس)، ويرجع
// كل حالة (صنف + فرع) وصلت لحد إعادة الطلب أو أقل.
// ملحوظة: البروسيدر بيتنده لكل صنف/فرع لأنه بياخد itemNO كباراميتر مطلوب - ده
// نفس المنطق المجرب في الفحص اليدوي بالظبط، بس بيتلف على كل الأصناف مش صنف واحد.
async function checkAllItemsAcrossBranches(pool) {
  const [branchIds, items] = await Promise.all([
    branchRepository.getAllBranchIds(pool),
    itemsRepository.getAllItemsWithReorder(pool),
  ]);

  const belowThreshold = [];

  for (const item of items) {
    for (const branchID of branchIds) {
      let rows;
      try {
        rows = await stockRepository.runFollowRequestEnd(pool, { itemNO: item.ID, branchID });
      } catch (err) {
        console.error(`[MultiCheck] فرع ${branchID} - صنف ${item.Code} - خطأ في wh_FollowRequestEnd:`, err.message);
        continue;
      }
      const match = rows.find((r) => String(r.itemid) === String(item.ID));
      if (match) {
        belowThreshold.push({ item, branchID, row: match });
      }
    }
  }

  return belowThreshold;
}

// بيشغل الفحص الكامل لعميل معين، ولو فيه أي حالة تحت الحد بيبعت رسالة واتساب
// واحدة مجمعة لرقم العميل المتظبط في إعداداته.
async function runCheckForClient(clientConnectionConfig) {
  const pool = await clientPoolManager.getPoolForClient(clientConnectionConfig);
  const belowThreshold = await checkAllItemsAcrossBranches(pool);

  let whatsappResult = null;
  if (belowThreshold.length > 0) {
    const message = buildWhatsappMessage(clientConnectionConfig.clientName, belowThreshold);
    try {
      await whatsappService.sendWhatsappMessage(clientConnectionConfig.whatsappPhone, message);
      whatsappResult = { sent: true };
      console.log(
        `[MultiCheck] اتبعتت رسالة واتساب للعميل "${clientConnectionConfig.clientName}" (${belowThreshold.length} حالة)`
      );
    } catch (err) {
      whatsappResult = { sent: false, error: err.message };
      console.error(`[MultiCheck] فشل إرسال واتساب للعميل "${clientConnectionConfig.clientName}":`, err.message);
    }
  }

  return {
    clientId: clientConnectionConfig.id,
    clientName: clientConnectionConfig.clientName,
    belowThresholdCount: belowThreshold.length,
    belowThreshold,
    whatsapp: whatsappResult,
  };
}

module.exports = { checkAllItemsAcrossBranches, runCheckForClient };
