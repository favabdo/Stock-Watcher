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
// والرول (من غير أي بيانات حساسة زي باسورد أو بيانات اتصال قاعدة البيانات)
function signClientToken(client) {
  return jwt.sign(
    { clientId: client.id, clientName: client.clientName, role: client.role ?? 0 },
    getSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

// بيتحقق من التوكن وبيرجع البيانات اللي جواه، أو null لو غلط/منتهي
function verifyClientToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    return { id: payload.clientId, clientName: payload.clientName, role: payload.role ?? 0 };
  } catch (err) {
    return null;
  }
}

module.exports = { signClientToken, verifyClientToken };
