const notificationsRepository = require('../repositories/notificationsRepository');
const notificationDeliveriesRepository = require('../repositories/notificationDeliveriesRepository');
const mobileDevicesRepository = require('../repositories/mobileDevicesRepository');
const clientPhonesRepository = require('../repositories/clientPhonesRepository');

// ينشئ سجل الإشعار (in-app history) + صفوف التسليم (push/WhatsApp) لكل
// الأهداف المتاحة. لو DedupeKey موجود من قبل، لا ينشئ تسليمات جديدة.
async function createNotifications({ clientId, settings, alerts }) {
  if (!alerts || alerts.length === 0) return [];

  const [devices, phones] = await Promise.all([
    settings.pushEnabled ? mobileDevicesRepository.getEnabledDevices(clientId) : Promise.resolve([]),
    settings.whatsAppEnabled
      ? clientPhonesRepository.getPhonesForClient(clientId).then((rows) =>
          rows.filter((p) => p.enabled && p.phone)
        )
      : Promise.resolve([]),
  ]);

  const created = [];
  for (const alert of alerts) {
    const inserted = await notificationsRepository.insertNotification({
      clientId,
      type: alert.type,
      severity: alert.severity,
      entityType: alert.entityType,
      entityId: alert.entityId,
      entityKey: alert.entityKey,
      titleAr: alert.titleAr,
      bodyAr: alert.bodyAr,
      payload: alert.payload,
      dedupeKey: alert.dedupeKey,
    });

    if (!inserted.created) continue;

    const deliveries = [];
    for (const device of devices) {
      deliveries.push(
        notificationDeliveriesRepository.enqueue(inserted.id, 'push', device.PushToken, device.DeviceId)
      );
    }
    for (const phone of phones) {
      deliveries.push(
        notificationDeliveriesRepository.enqueue(inserted.id, 'whatsapp', phone.phone, null)
      );
    }
    await Promise.all(deliveries);

    created.push({ ...alert, id: inserted.id });
  }

  return created;
}

module.exports = { createNotifications };
