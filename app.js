require('dotenv').config();
const express = require('express');
const path = require('path');
const itemsRoutes = require('./routes/items.routes');
const clientsRoutes = require('./routes/clients.routes');
const authRoutes = require('./routes/auth.routes');
const scheduledCheckJob = require('./jobs/scheduledCheckJob');
const cacheWarmup = require('./jobs/cacheWarmup');

const app = express();
app.use(express.json());

// Health check (Render pings this to confirm the service is alive)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/clients', clientsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'خطأ في السيرفر' });
});

// الفحص التلقائي المجدول لكل العملاء (اختياري - يتفعل بـ ENABLE_CRON=true)
scheduledCheckJob.start();

// تسخين كاش الأصناف تحت حد إعادة الطلب لكل العملاء وقت بدء تشغيل السيرفر -
// من غير await عشان مايأخرش استقبال الطلبات (بما فيها /health). ده اللي بيخلي
// أول فتح للصفحة الرئيسية بعد أي ديبلوي/إعادة تشغيل سريع بدل ما يستنى فحص كامل.
cacheWarmup.warmAllClients().catch((err) => {
  console.error('[Warmup] خطأ غير متوقع أثناء تسخين الكاش:', err.message);
});

module.exports = app;
