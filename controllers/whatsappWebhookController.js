// استقبال الـ Webhook بتاع WhatsApp Cloud API من Meta.
//
// إعدادات مطلوبة في environment variables:
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN - نص سري إنت اللي بتخترعه، بتحطه هنا وبتحطه
//                                   بالظبط في خانة "Verify Token" وقت ما تضيف
//                                   الـ Callback URL في Meta App Dashboard.
//                                   (ده مش باسورد جاهز من ميتا، إنت اللي بتعمله).

// GET /api/webhooks/whatsapp
// ميتا بتنادي على الراوت ده مرة واحدة وقت ما تضيف/تعدّل الـ Callback URL،
// عشان تتأكد إن السيرفر بتاعك فعلاً بتاعك وإنك موافق تستقبل منها.
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error('[WhatsappWebhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN مش متظبط في الـ environment');
    return res.sendStatus(500);
  }

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsappWebhook] تم التحقق من الـ webhook بنجاح');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsappWebhook] فشل التحقق: التوكن غير مطابق');
  return res.sendStatus(403);
}

// POST /api/webhooks/whatsapp
// ميتا بتنادي على الراوت ده كل ما يحصل حدث (رسالة جديدة من عميل، تحديث حالة
// تسليم رسالة...إلخ). دلوقتي بس بنسجله في اللوج؛ ممكن تضيف منطق أكتر بعدين
// (زي حفظ رد العميل في قاعدة البيانات أو الرد عليه تلقائيًا).
function receiveEvent(req, res) {
  try {
    console.log('[WhatsappWebhook] Event مستلم:', JSON.stringify(req.body));
  } catch (err) {
    console.error('[WhatsappWebhook] خطأ في معالجة الحدث:', err.message);
  }

  // لازم ترجع 200 بسرعة، وإلا ميتا هتعتبر السيرفر فاشل وتعيد المحاولة/توقف الإشعارات.
  return res.sendStatus(200);
}

module.exports = { verifyWebhook, receiveEvent };
