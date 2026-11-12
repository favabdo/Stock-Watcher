const clientsRepository = require('../repositories/clientsRepository');

// التوكن صالح 30 يوم/60 دقيقة، لكن تعطيل العميل من لوحة التحكم لازم يوقف
// الوصول فورًا. كل مسارات العميل الجديدة تمر من هنا.
async function requireActiveClient(req, res, next) {
  try {
    const active = await clientsRepository.isClientActive(req.client.id);
    if (!active) {
      return res.status(403).json({
        error: 'حساب العميل متوقف. تواصل مع الإدارة.',
        code: 'CLIENT_INACTIVE',
      });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = requireActiveClient;
