const notificationsRepository = require('../repositories/notificationsRepository');
const { httpError } = require('../utils/apiError');

async function list(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : null;
    const type = req.query.type ? String(req.query.type) : null;
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';

    const [page, unreadCount] = await Promise.all([
      notificationsRepository.list(req.client.id, { limit, cursor, type, unreadOnly }),
      notificationsRepository.unreadCount(req.client.id),
    ]);

    res.json({ ...page, unreadCount });
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    res.json({ count: await notificationsRepository.unreadCount(req.client.id) });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw httpError(400, 'VALIDATION_ERROR', 'id غير صالح');
    const updated = await notificationsRepository.markRead(req.client.id, id);
    if (updated === 0) throw httpError(404, 'NOT_FOUND', 'الإشعار غير موجود');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const upToId = req.body?.upToId ? Number(req.body.upToId) : null;
    const updated = await notificationsRepository.markAllRead(req.client.id, upToId);
    res.json({ updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markRead, markAllRead };
