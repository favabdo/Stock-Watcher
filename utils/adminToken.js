const jwt = require('jsonwebtoken');

const TOKEN_TTL = '12h'; // جلسة الأدمن أقصر من جلسة العميل عمدًا، لأنها بتوصل لبيانات حساسة (اتصال قواعد بيانات العملاء)

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

// بيولد توكن لجلسة الأدمن بعد ما يسجل دخول بنجاح. الحقل type: 'admin' مهم
// عشان نفرّق توكن الأدمن عن توكن العميل (utils/clientToken.js) حتى لو
// استخدمنا نفس الـ JWT_SECRET - توكن عميل عادي مبيقدرش يوصل لـ /api/admin/*
function signAdminToken(admin) {
  return jwt.sign(
    { type: 'admin', adminId: admin.id, username: admin.username },
    getSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

// بيتحقق من التوكن وبيتأكد إنه توكن أدمن فعلاً، أو بيرجع null لو غلط/منتهي/مش أدمن
function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    if (payload.type !== 'admin') return null;
    return { id: payload.adminId, username: payload.username };
  } catch (err) {
    return null;
  }
}

module.exports = { signAdminToken, verifyAdminToken };
