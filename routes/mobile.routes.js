const express = require('express');
const clientAuth = require('../middleware/clientAuth');
const requireActiveClient = require('../middleware/requireActiveClient');
const { createRateLimiter } = require('../middleware/mobileRateLimit');

const mobileAuthController = require('../controllers/mobileAuthController');
const mobileBootstrapController = require('../controllers/mobileBootstrapController');
const mobileDevicesController = require('../controllers/mobileDevicesController');
const mobileItemsController = require('../controllers/mobileItemsController');
const notificationsController = require('../controllers/notificationsController');
const alertSettingsController = require('../controllers/alertSettingsController');
const reportsController = require('../controllers/reportsController');

const router = express.Router();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.MOBILE_AUTH_RATE_LIMIT) || 10,
});

const exportLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.MOBILE_EXPORT_RATE_LIMIT) || 6,
  keyFn: (req) => req.client?.id || req.ip,
});

const protectedRoute = [clientAuth, requireActiveClient];

// Auth (بدون clientAuth)
router.post('/auth/login', authLimiter, mobileAuthController.login);
router.post('/auth/refresh', authLimiter, mobileAuthController.refresh);
router.post('/auth/logout', mobileAuthController.logout);

// بيانات التطبيق
router.get('/bootstrap', protectedRoute, mobileBootstrapController.getBootstrap);

// قراءة مخزون صنف بدون إرسال واتساب
router.get('/items/:id/stock', protectedRoute, mobileItemsController.getStock);

// أجهزة Push
router.post('/devices', protectedRoute, mobileDevicesController.register);
router.patch('/devices/:deviceId', protectedRoute, mobileDevicesController.patch);
router.delete('/devices/:deviceId', protectedRoute, mobileDevicesController.remove);

// مركز الإشعارات
router.get('/notifications', protectedRoute, notificationsController.list);
router.get('/notifications/unread-count', protectedRoute, notificationsController.unreadCount);
router.post('/notifications/read-all', protectedRoute, notificationsController.markAllRead);
router.post('/notifications/:id/read', protectedRoute, notificationsController.markRead);

// إعدادات التنبيهات
router.get('/settings/alerts', protectedRoute, alertSettingsController.get);
router.put('/settings/alerts', protectedRoute, alertSettingsController.update);

// التقارير
router.get('/reports', protectedRoute, reportsController.list);
router.post('/reports/:id/run', protectedRoute, reportsController.run);
router.post('/reports/:id/export', protectedRoute, exportLimiter, reportsController.exportReport);

module.exports = router;
