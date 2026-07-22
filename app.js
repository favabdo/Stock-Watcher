require('dotenv').config();
const express = require('express');
const path = require('path');
const itemsRoutes = require('./routes/items.routes');

const app = express();
app.use(express.json());

// Health check (Render pings this to confirm the service is alive)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/items', itemsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'خطأ في السيرفر' });
});

module.exports = app;
