const alertSettingsRepository = require('../repositories/alertSettingsRepository');
const notificationsRepository = require('../repositories/notificationsRepository');
const kpiService = require('../services/kpiService');
const { getClientPoolAndConfig } = require('./itemsController');
const { publicSettings } = require('./mobileAuthController');

async function getBootstrap(req, res, next) {
  try {
    const { pool } = await getClientPoolAndConfig(req);
    const settings = await alertSettingsRepository.getByClientId(req.client.id);

    const [kpi, unreadNotifications] = await Promise.all([
      kpiService.getKpis(req.client.id, pool, settings),
      notificationsRepository.unreadCount(req.client.id),
    ]);

    res.json({
      client: {
        id: req.client.id,
        clientName: req.client.clientName,
        role: req.client.role ?? 0,
      },
      settings: publicSettings(settings),
      kpi: {
        ...kpi,
        unreadNotifications,
      },
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBootstrap };
