// حماية بسيطة (Basic Auth) لصفحة/API الإعدادات، لأنها بتحتوي بيانات دخول
// قواعد بيانات العملاء وتوكن واتساب. متظبطة عن طريق:
//   SETTINGS_BASIC_AUTH_USER
//   SETTINGS_BASIC_AUTH_PASS
// لو الاتنين مش متظبطين في الـ environment، الحماية بتتلغي تلقائيًا (وضع تطوير فقط).

function basicAuth(req, res, next) {
  const user = process.env.SETTINGS_BASIC_AUTH_USER;
  const pass = process.env.SETTINGS_BASIC_AUTH_PASS;

  if (!user || !pass) {
    console.warn('[Auth] SETTINGS_BASIC_AUTH_USER/PASS مش متظبطين - صفحة الإعدادات من غير حماية!');
    return next();
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sepIndex = decoded.indexOf(':');
    const reqUser = decoded.slice(0, sepIndex);
    const reqPass = decoded.slice(sepIndex + 1);
    if (reqUser === user && reqPass === pass) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Stock Watcher Settings"');
  return res.status(401).json({ error: 'محتاج تسجيل دخول للوصول للإعدادات' });
}

module.exports = basicAuth;
