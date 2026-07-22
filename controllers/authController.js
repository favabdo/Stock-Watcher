const clientsRepository = require('../repositories/clientsRepository');
const { comparePassword } = require('../utils/password');
const { signClientToken } = require('../utils/clientToken');

// تسجيل دخول العميل باليوزر والباسورد اللي الأدمن أداهوله من صفحة الإعدادات
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'لازم تكتب اليوزر والباسورد' });
    }

    const client = await clientsRepository.getClientLoginByUsername(username.trim());
    if (!client || !client.isActive) {
      return res.status(401).json({ error: 'اليوزر أو الباسورد غلط' });
    }

    const ok = await comparePassword(password, client.loginPasswordHash);
    if (!ok) {
      return res.status(401).json({ error: 'اليوزر أو الباسورد غلط' });
    }

    const token = signClientToken(client);
    res.json({
      token,
      client: { id: client.id, clientName: client.clientName, role: client.role ?? 0 },
    });
  } catch (err) {
    next(err);
  }
}

// بيرجع بيانات العميل المسجل دخول حاليًا (يستخدم لاسترجاع الجلسة بعد إعادة تحميل الصفحة)
async function me(req, res) {
  res.json({ client: req.client });
}

module.exports = { login, me };
