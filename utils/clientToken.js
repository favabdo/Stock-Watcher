const jwt = require('jsonwebtoken');

const TOKEN_TTL = '30d'; // مدة صلاحية جلسة تسجيل دخول العميل

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET مش متظبط في الـ environment variables. ولّده بالأمر: ' +
      `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
    );
  }
  return secret;
}

// بيولد توكن لجلسة العميل بعد ما يسجل دخول بنجاح، بيحتوي بس على الآيدي والاسم
// والرول (من غير أي بيانات حساسة زي باسورد أو بيانات اتصال قاعدة البيانات).
// options.ttl / options.extraClaims اختياريان: الموبايل يستخدم توكين أقصر
// (access token) مع claims إضافية، والويب يفضل على السلوك الافتراضي 30 يوم.
function signClientToken(client, options = {}) {
  const ttl = options.ttl || TOKEN_TTL;
  const extraClaims = options.extraClaims || {};
  return jwt.sign(
    {
      clientId: client.id,
      clientName: client.clientName,
      role: client.role ?? 0,
      // نوع التنبيهات المفعّلة - بتتحط في التوكن عشان الفرونت إند يعرف يظهر
      // (أو يخفي) قسم "تجاوز الحد الائتماني" في الصفحة الرئيسية من غير نداء إضافي.
      alertStockEnabled: client.alertStockEnabled !== false,
      alertCreditLimitEnabled: !!client.alertCreditLimitEnabled,
      ...extraClaims,
    },
    getSecret(),
    { expiresIn: ttl }
  );
}

// بيتحقق من التوكن وبيرجع البيانات اللي جواه، أو null لو غلط/منتهي.
// لازم يحتوي clientId - ده يمنع توكن الأدمن (اللي مالوش clientId) من
// الدخول على مسارات العميل.
function verifyClientToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    if (payload.clientId === undefined || payload.clientId === null) return null;
    return {
      id: payload.clientId,
      clientName: payload.clientName,
      role: payload.role ?? 0,
      alertStockEnabled: payload.alertStockEnabled !== false,
      alertCreditLimitEnabled: !!payload.alertCreditLimitEnabled,
    };
  } catch (err) {
    return null;
  }
}

module.exports = { signClientToken, verifyClientToken };
