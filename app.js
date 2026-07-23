require('dotenv').config();
const express = require('express');
const path = require('path');
const itemsRoutes = require('./routes/items.routes');
const clientsRoutes = require('./routes/clients.routes');
const authRoutes = require('./routes/auth.routes');
const adminAuthRoutes = require('./routes/adminAuth.routes');
const whatsappWebhookRoutes = require('./routes/whatsappWebhook.routes');
const scheduledCheckJob = require('./jobs/scheduledCheckJob');

const app = express();
app.use(express.json());

// Health check (Render pings this to confirm the service is alive)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/webhooks/whatsapp', whatsappWebhookRoutes);

// صفحة الأدمن (/admin) صفحة منفصلة تمامًا عن صفحة اليوزر على مستوى الفرونت
// إند (باندل واحد، بس بيقرر يعرض إيه على حسب المسار). لازم نرجّع index.html
// لأي مسار مش /api عشان الراوت ده يشتغل حتى لو حد فتح /admin مباشرة أو عمل ريفريش.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'خطأ في السيرفر' });
});

// الفحص التلقائي المجدول لكل العملاء (اختياري - يتفعل بـ ENABLE_CRON=true)
scheduledCheckJob.start();

module.exports = app;
