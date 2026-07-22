const { verifyClientToken } = require('../utils/clientToken');

// بيحمي كل API بيانات الأصناف - العميل لازم يكون مسجل دخول (يوزر وباسورد
// أداهوله الأدمن) عشان يوصل لبياناته هو بس. بيحط req.client = { id, clientName }
// عشان الـ controllers تستخدمه في تحديد قاعدة بيانات العميل الصح.
function clientAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'محتاج تسجيل دخول' });
  }

  const client = verifyClientToken(token);
  if (!client) {
    return res.status(401).json({ error: 'جلسة الدخول غير صالحة أو منتهية، سجل دخول تاني' });
  }

  req.client = client;
  next();
}

module.exports = clientAuth;
