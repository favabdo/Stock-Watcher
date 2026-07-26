const express = require('express');
const router = express.Router();
const scheduledCheckJob = require('../jobs/scheduledCheckJob');

// Endpoint اختياري لتشغيل الفحص فورًا يدويًا (مفيد للتجربة، أو لو حبيت تربطه
// بأي أداة جدولة خارجية لأي سبب). مش مطلوب في السيناريو العادي لسيرفر دايمًا
// شغال - الجدولة الداخلية (jobs/scheduledCheckJob.js مع ENABLE_CRON=true)
// كافية لوحدها وشغالة أوتوماتيك.
//
// محمي بمفتاح سري (CRON_SECRET) عشان محدش يقدر يستدعيه غير الجهة اللي معاها
// المفتاح - لازم يتحط في الـ header x-cron-secret أو query param ?secret=.
//
// اعمل GET أو POST، الاتنين شغالين.
router.all('/run-check', async (req, res, next) => {
  const providedSecret = req.header('x-cron-secret') || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return res.status(503).json({
      error: 'CRON_SECRET مش متحطوط في متغيرات البيئة على السيرفر - محتاج تحطه الأول عشان الـ endpoint ده يشتغل.',
    });
  }
  if (providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'مش مصرح' });
  }

  try {
    await scheduledCheckJob.runAllClientsCheck();
    res.json({ ok: true, ranAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
