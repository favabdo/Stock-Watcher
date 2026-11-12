const cron = require('node-cron');
const deliveriesRepository = require('../repositories/notificationDeliveriesRepository');
const notificationsRepository = require('../repositories/notificationsRepository');
const mobileDevicesRepository = require('../repositories/mobileDevicesRepository');
const creditAlertsRepository = require('../repositories/creditAlertsRepository');
const pushService = require('../services/pushService');
const whatsappService = require('../services/whatsappService');

const BATCH_SIZE = Number(process.env.NOTIFICATION_BATCH_SIZE) || 25;
const MAX_ATTEMPTS = Number(process.env.NOTIFICATION_MAX_ATTEMPTS) || 6;
const RETRY_BASE_SECONDS = Number(process.env.NOTIFICATION_RETRY_BASE_SECONDS) || 30;

let isRunning = false;

function nextAttemptAt(attempts) {
  const seconds = Math.min(RETRY_BASE_SECONDS * Math.pow(2, attempts), 3600);
  return new Date(Date.now() + seconds * 1000);
}

function flattenData(notification) {
  const data = {
    notificationId: notification.id,
    type: notification.type,
    entityType: notification.entityType,
    entityId: notification.entityId,
  };
  if (notification.payload && typeof notification.payload === 'object') {
    for (const [key, value] of Object.entries(notification.payload)) {
      if (['string', 'number', 'boolean'].includes(typeof value)) data[key] = value;
    }
  }
  return data;
}

// بعد نجاح أول تسليم فعلي لتنبيه ائتماني، نثبت آخر مبلغ أُرسل.
// لو الإرسال فشل بالكامل، baseline يفضل زي ما هو فيقدر يعيد التنبيه لاحقًا.
async function afterSuccessfulDelivery(notification) {
  if (!notification.type || !notification.type.startsWith('credit_')) return;
  const payload = notification.payload || {};
  if (payload.customerId === undefined || payload.overAmount === undefined) return;
  await creditAlertsRepository.setLastNotifiedOverAmount(
    notification.clientId,
    payload.customerId,
    payload.branchId ?? 0,
    payload.overAmount
  );
}

async function processDelivery(delivery, notification) {
  if (!notification) {
    await deliveriesRepository.markSkipped(delivery.id, 'NOTIFICATION_NOT_FOUND');
    return;
  }

  if (delivery.channel === 'push') {
    const result = await pushService.sendToToken(delivery.target, {
      title: notification.titleAr,
      body: notification.bodyAr,
      data: flattenData(notification),
      collapseKey: `client_${notification.clientId}_${notification.type}`,
    });

    if (result.ok) {
      await deliveriesRepository.markSent(delivery.id);
      await afterSuccessfulDelivery(notification);
      return;
    }
    if (result.skipped) {
      await deliveriesRepository.markSkipped(delivery.id, result.errorCode);
      return;
    }
    if (result.unregistered) {
      await mobileDevicesRepository.disableByPushToken(delivery.target);
      await deliveriesRepository.markSkipped(delivery.id, result.errorCode);
      return;
    }

    const next = delivery.attempts >= MAX_ATTEMPTS ? null : nextAttemptAt(delivery.attempts);
    await deliveriesRepository.markFailed(
      delivery.id,
      result.error || result.errorCode || 'PUSH_FAILED',
      next
    );
    return;
  }

  if (delivery.channel === 'whatsapp') {
    await whatsappService.sendWhatsappMessage(delivery.target, notification.bodyAr);
    await deliveriesRepository.markSent(delivery.id);
    await afterSuccessfulDelivery(notification);
    return;
  }

  await deliveriesRepository.markSkipped(delivery.id, `UNKNOWN_CHANNEL:${delivery.channel}`);
}

async function runOnce() {
  if (isRunning) return;
  isRunning = true;

  try {
    const batch = await deliveriesRepository.claimBatch(BATCH_SIZE);
    if (batch.length === 0) return;

    const byId = await notificationsRepository.getManyByIds([
      ...new Set(batch.map((d) => d.notificationId)),
    ]);

    for (const delivery of batch) {
      const notification = byId.get(delivery.notificationId);
      try {
        await processDelivery(delivery, notification);
      } catch (err) {
        const next = delivery.attempts >= MAX_ATTEMPTS ? null : nextAttemptAt(delivery.attempts);
        await deliveriesRepository.markFailed(delivery.id, err.message, next);
        console.error(
          `[Dispatch] فشل تسليم ${delivery.channel} للإشعار ${delivery.notificationId}:`,
          err.message
        );
      }
    }
  } catch (err) {
    console.error('[Dispatch] فشل دورة الإرسال:', err.message);
  } finally {
    isRunning = false;
  }
}

function start() {
  if (process.env.NOTIFICATION_DISPATCH_ENABLED === 'false') {
    console.log('[Dispatch] إرسال الإشعارات متوقف (NOTIFICATION_DISPATCH_ENABLED=false)');
    return;
  }
  const schedule = process.env.NOTIFICATION_DISPATCH_CRON || '*/30 * * * * *';
  if (!cron.validate(schedule)) {
    console.error(`[Dispatch] NOTIFICATION_DISPATCH_CRON غير صحيح: "${schedule}"`);
    return;
  }
  cron.schedule(schedule, runOnce);
  console.log(`[Dispatch] إرسال الإشعارات شغال بجدول: "${schedule}"`);
}

module.exports = { start, runOnce };
