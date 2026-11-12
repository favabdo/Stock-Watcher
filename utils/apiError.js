// خطأ API موحّد: رسالة عربية آمنة + كود ثابت يستخدمه تطبيق الموبايل
// في الترجمة/التصرف بدون الاعتماد على نص الرسالة.
function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.expose = status < 500;
  return err;
}

module.exports = { httpError };
