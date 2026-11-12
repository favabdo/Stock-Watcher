const clientPoolManager = require('./clientPoolManager');
const multiClientCheckService = require('./multiClientCheckService');
const creditLimitCheckService = require('./creditLimitCheckService');
const notificationService = require('./notificationService');
const { computeReorderSuggestion } = require('./reorderSuggestionService');
const alertsRepository = require('../repositories/alertsRepository');
const creditAlertsRepository = require('../repositories/creditAlertsRepository');
const alertSettingsRepository = require('../repositories/alertSettingsRepository');
const itemsRepository = require('../repositories/itemsRepository');
const { zonedParts, isDigestDue } = require('../utils/digestSchedule');

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value) {
  return num(value).toLocaleString('en-US');
}

function itemLabel(row) {
  return row.Name_Ar || row.Name_En || row.Code || row.itemname || '';
}

function stockKey(itemId, storeId) {
  return `${itemId}:${storeId}`;
}

function creditKey(customerId, branchId) {
  return `${customerId}:${branchId ?? 0}`;
}

function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function hourKey(now = new Date()) {
  return `${todayKey(now)}${String(now.getHours()).padStart(2, '0')}`;
}

function stockZeroAlert(row, now) {
  const stock = num(row.transpkgqty1);
  return {
    type: 'stock_zero',
    severity: 3,
    entityType: 'item',
    entityId: Number(row.itemid),
    entityKey: `item:${row.itemid}:store:${row.storeid}`,
    titleAr: 'نفاد مخزون',
    bodyAr: `الصنف ${row.Code} - ${itemLabel(row)} رصيده صفر في ${row.storename}.`,
    payload: {
      type: 'stock_zero',
      itemId: Number(row.itemid),
      itemCode: row.Code,
      storeId: Number(row.storeid),
      storeName: row.storename,
      stock,
      reorderQty: num(row.ReorderQty),
    },
    dedupeKey: `stock_zero:${row.itemid}:${row.storeid}:${hourKey(now)}`,
  };
}

function stockLowAlert(row, now) {
  const stock = num(row.transpkgqty1);
  return {
    type: 'stock_low',
    severity: 2,
    entityType: 'item',
    entityId: Number(row.itemid),
    entityKey: `item:${row.itemid}:store:${row.storeid}`,
    titleAr: 'نقص مخزون',
    bodyAr: `الصنف ${row.Code} - ${itemLabel(row)} وصل لحد إعادة الطلب في ${row.storename}: الرصيد ${fmt(stock)} (الحد ${fmt(row.ReorderQty)}).`,
    payload: {
      type: 'stock_low',
      itemId: Number(row.itemid),
      itemCode: row.Code,
      storeId: Number(row.storeid),
      storeName: row.storename,
      stock,
      reorderQty: num(row.ReorderQty),
    },
    dedupeKey: `stock_low:${row.itemid}:${row.storeid}:${hourKey(now)}`,
  };
}

function reorderAlert(row, suggestedQty, now) {
  const stock = num(row.transpkgqty1);
  return {
    type: 'reorder_suggestion',
    severity: 1,
    entityType: 'item',
    entityId: Number(row.itemid),
    entityKey: `item:${row.itemid}:store:${row.storeid}`,
    titleAr: 'اقتراح إعادة طلب',
    bodyAr: `الصنف ${row.Code} - ${itemLabel(row)} في ${row.storename}: الكمية المقترحة ${fmt(suggestedQty)} (الرصيد ${fmt(stock)}).`,
    payload: {
      type: 'reorder_suggestion',
      itemId: Number(row.itemid),
      itemCode: row.Code,
      storeId: Number(row.storeid),
      storeName: row.storename,
      stock,
      reorderQty: num(row.ReorderQty),
      suggestedQty,
    },
    dedupeKey: `reorder:${row.itemid}:${row.storeid}:${todayKey(now)}`,
  };
}

function creditOverAlert(row, now) {
  const branchId = row.branchId == null ? 0 : Number(row.branchId);
  const branchText = row.branchName ? ` (${row.branchName})` : '';
  return {
    type: 'credit_over',
    severity: 2,
    entityType: 'customer',
    entityId: Number(row.customerId),
    entityKey: `credit:${row.customerId}:${branchId}`,
    titleAr: 'تجاوز الحد الائتماني',
    bodyAr: `العميل ${row.customerName || row.customerCode || row.customerId}${branchText} تجاوز الحد الائتماني بمبلغ ${fmt(row.overAmount)} جنيه (الرصيد ${fmt(row.balance)} / الحد ${fmt(row.creditLimit)}).`,
    payload: {
      type: 'credit_over',
      customerId: Number(row.customerId),
      customerCode: row.customerCode || null,
      customerName: row.customerName || null,
      branchId,
      branchName: row.branchName || null,
      creditLimit: num(row.creditLimit),
      balance: num(row.balance),
      overAmount: num(row.overAmount),
    },
    dedupeKey: `credit_over:${row.customerId}:${branchId}:${hourKey(now)}`,
  };
}

function creditIncreaseAlert(row, delta, now) {
  const branchId = row.branchId == null ? 0 : Number(row.branchId);
  const branchText = row.branchName ? ` (${row.branchName})` : '';
  return {
    type: 'credit_increase',
    severity: 3,
    entityType: 'customer',
    entityId: Number(row.customerId),
    entityKey: `credit:${row.customerId}:${branchId}`,
    titleAr: 'تزايد تجاوز الحد الائتماني',
    bodyAr: `العميل ${row.customerName || row.customerCode || row.customerId}${branchText} زاد تجاوزه بمبلغ ${fmt(delta)} جنيه ليصبح ${fmt(row.overAmount)} جنيه.`,
    payload: {
      type: 'credit_increase',
      customerId: Number(row.customerId),
      customerCode: row.customerCode || null,
      customerName: row.customerName || null,
      branchId,
      branchName: row.branchName || null,
      creditLimit: num(row.creditLimit),
      balance: num(row.balance),
      overAmount: num(row.overAmount),
      increaseAmount: num(delta),
    },
    dedupeKey: `credit_increase:${row.customerId}:${branchId}:${Math.round(num(row.overAmount) * 100)}`,
  };
}

async function runStockCycle(fullConfig, settings, pool, now = new Date()) {
  const rows = await multiClientCheckService.checkAllItemsAcrossBranches(pool);
  const activeRows = [];

  for (const row of rows) {
    const stock = num(row.transpkgqty1);
    if (stock <= 0 && settings.stockZeroEnabled) activeRows.push(row);
    else if (stock > 0 && settings.stockLowEnabled) activeRows.push(row);
    else if (settings.reorderSuggestionEnabled) activeRows.push(row);
  }

  // إزالة التكرار قبل تمريرها لـ syncAlerts (المفتاح itemid+storeid).
  const uniqueRows = [...new Map(activeRows.map((r) => [stockKey(r.itemid, r.storeid), r])).values()];
  const { newAlerts } = await alertsRepository.syncAlerts(fullConfig.id, uniqueRows);

  const alerts = [];
  const itemIds = [...new Set(newAlerts.map((r) => Number(r.itemid)))];
  const itemMeta = settings.reorderSuggestionEnabled
    ? await itemsRepository.getItemsMinMax(pool, itemIds)
    : new Map();

  for (const row of newAlerts) {
    const stock = num(row.transpkgqty1);
    const isZero = stock <= 0;

    if (isZero && settings.stockZeroEnabled) {
      alerts.push(stockZeroAlert(row, now));
    } else if (!isZero && settings.stockLowEnabled) {
      alerts.push(stockLowAlert(row, now));
    }

    if (settings.reorderSuggestionEnabled) {
      const meta = itemMeta.get(Number(row.itemid)) || {};
      const suggested = computeReorderSuggestion({
        stock,
        reorderQty: row.ReorderQty,
        minQty: meta.MinQty,
        maxQty: meta.MaxQty,
      });
      if (suggested > 0) alerts.push(reorderAlert(row, suggested, now));
    }
  }

  const created = await notificationService.createNotifications({
    clientId: fullConfig.id,
    settings,
    alerts,
  });

  return {
    belowThresholdCount: rows.length,
    activeCount: uniqueRows.length,
    newAlertsCount: newAlerts.length,
    notificationsCreated: created.length,
  };
}

async function runCreditCycle(fullConfig, settings, pool, now = new Date()) {
  const rows = await creditLimitCheckService.checkAllCustomersOverCreditLimit(pool);
  const open = await creditAlertsRepository.getOpenAlertsForClient(fullConfig.id);
  const openMap = new Map(open.map((o) => [creditKey(o.customerId, o.branchId), o]));
  const currentKeys = new Set(rows.map((r) => creditKey(r.customerId, r.branchId)));

  const alerts = [];
  for (const row of rows) {
    const customerId = Number(row.customerId);
    const branchId = row.branchId == null ? 0 : Number(row.branchId);
    const key = creditKey(customerId, branchId);
    const state = openMap.get(key);

    if (!state) {
      if (settings.creditOverEnabled) {
        // LastNotifiedOverAmount يفضل NULL لحد ما الإرسال ينجح (dispatcher).
        await creditAlertsRepository.upsertOpenAlert(fullConfig.id, customerId, branchId, null);
        alerts.push(creditOverAlert(row, now));
      } else {
        // تزايد الائتمان فقط: أول رصد = baseline بدون تنبيه.
        await creditAlertsRepository.upsertOpenAlert(fullConfig.id, customerId, branchId, num(row.overAmount));
      }
      continue;
    }

    // حالة قديمة/مرحّلة بدون baseline: نثبتها بهدوء.
    if (state.lastNotifiedOverAmount == null) {
      await creditAlertsRepository.setLastNotifiedOverAmount(
        fullConfig.id,
        customerId,
        branchId,
        num(row.overAmount)
      );
      continue;
    }

    const delta = num(row.overAmount) - num(state.lastNotifiedOverAmount);
    const threshold = num(settings.creditIncreaseThreshold);
    if (settings.creditIncreaseEnabled && delta > 0 && delta >= threshold) {
      alerts.push(creditIncreaseAlert(row, delta, now));
    }
  }

  const resolved = open
    .filter((o) => !currentKeys.has(creditKey(o.customerId, o.branchId)))
    .map((o) => ({ customerId: o.customerId, branchId: o.branchId }));

  if (resolved.length > 0) {
    await creditAlertsRepository.deleteResolvedAlerts(fullConfig.id, resolved);
  }

  const created = await notificationService.createNotifications({
    clientId: fullConfig.id,
    settings,
    alerts,
  });

  return {
    overLimitCount: rows.length,
    resolvedCount: resolved.length,
    newAlertsCount: alerts.length,
    notificationsCreated: created.length,
  };
}

// دورة كاملة لعميل واحد. لا ترسل واتساب مباشرة: كل التسليمات عبر outbox.
async function runClientCycle(fullConfig, { now = new Date() } = {}) {
  const settings = await alertSettingsRepository.getByClientId(fullConfig.id);
  if (!settings) throw new Error('إعدادات التنبيهات غير موجودة للعميل');

  const hasStockWork =
    settings.stockLowEnabled ||
    settings.stockZeroEnabled ||
    settings.reorderSuggestionEnabled;
  const hasCreditWork = settings.creditOverEnabled || settings.creditIncreaseEnabled;

  if (!hasStockWork && !hasCreditWork) {
    return {
      clientId: fullConfig.id,
      clientName: fullConfig.clientName,
      stock: null,
      credit: null,
      skipped: true,
    };
  }

  const pool = await clientPoolManager.getPoolForClient(fullConfig);
  const stock = hasStockWork ? await runStockCycle(fullConfig, settings, pool, now) : null;
  const credit = hasCreditWork ? await runCreditCycle(fullConfig, settings, pool, now) : null;

  return {
    clientId: fullConfig.id,
    clientName: fullConfig.clientName,
    stock,
    credit,
  };
}

async function runDigestCycle({ now = new Date() } = {}) {
  const candidates = await alertSettingsRepository.getDigestCandidates();
  const results = [];

  for (const settings of candidates) {
    if (!isDigestDue(settings, now)) continue;

    const cooldown = settings.digestFrequency === 'weekly' ? 144 : 20;
    const claimed = await alertSettingsRepository.claimDigest(settings.clientId, cooldown);
    if (!claimed) continue;

    const [stockKeys, creditKeys] = await Promise.all([
      alertsRepository.getOpenAlertKeys(settings.clientId),
      creditAlertsRepository.getOpenAlertKeys(settings.clientId),
    ]);

    const digest = {
      type: 'digest',
      severity: 1,
      entityType: 'digest',
      entityId: null,
      entityKey: null,
      titleAr: 'ملخص دوري',
      bodyAr:
        `ملخص Stock Watcher - ${settings.clientName}: ` +
        `${stockKeys.size} حالة نقص مخزون و${creditKeys.size} حالة تجاوز ائتماني مفتوحة حاليًا.`,
      payload: {
        type: 'digest',
        stockOpenCount: stockKeys.size,
        creditOpenCount: creditKeys.size,
      },
      dedupeKey: `digest:${settings.clientId}:${todayKey(now)}:${settings.digestFrequency}`,
    };

    const created = await notificationService.createNotifications({
      clientId: settings.clientId,
      settings,
      alerts: [digest],
    });
    results.push({ clientId: settings.clientId, created: created.length });
  }

  return results;
}

module.exports = {
  runClientCycle,
  runDigestCycle,
  isDigestDue,
  __test: { todayKey, hourKey, zonedParts },
};
