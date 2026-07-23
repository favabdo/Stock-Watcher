const { verifyAdminToken } = require('../utils/adminToken');

// بيحمي كل API بتاعة لوحة تحكم الأدمن (إدارة العملاء + إدارة حسابات الأدمن).
// الأدمن لازم يكون مسجل دخول فعليًا بيوزر وباسورد حقيقيين من جدول
// stockwatcheradmin_byA (مش Basic Auth ثابت زي الأول). بيحط req.admin = { id, username }.
function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'محتاج تسجيل دخول كأدمن' });
  }

  const admin = verifyAdminToken(token);
  if (!admin) {
    return res.status(401).json({ error: 'جلسة الأدمن غير صالحة أو منتهية، سجل دخول تاني' });
  }

  req.admin = admin;
  next();
}

module.exports = adminAuth;
