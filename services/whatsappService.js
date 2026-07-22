// إرسال رسائل واتساب عن طريق WhatsApp Cloud API بتاعة Meta Business.
//
// إعدادات مطلوبة في environment variables:
//   WHATSAPP_TOKEN            - Permanent/System User Access Token من Meta Business
//   WHATSAPP_PHONE_NUMBER_ID  - Phone Number ID (مش رقم الموبايل نفسه) من WhatsApp Manager
//
// اختياري:
//   WHATSAPP_API_VERSION      - افتراضي v20.0
//   WHATSAPP_MESSAGE_MODE     - "text" (افتراضي) أو "template"
//   WHATSAPP_TEMPLATE_NAME    - اسم القالب المعتمد من ميتا (لازم لو المود template)
//   WHATSAPP_TEMPLATE_LANG    - كود اللغة بتاع القالب، مثال: ar أو ar_EG (لازم لو المود template)
//   WHATSAPP_TEMPLATE_HAS_VARIABLE - "true" لو القالب فيه متغيّر {{1}} في الـ body،
//                             أو "false"/فاضي لو القالب نص ثابت من غير متغيرات (افتراضي: true)
//
// ملحوظة مهمة: رسائل بيزنس-initiated (زي تنبيهات نقص الاستوك دي) لو اتبعتت
// كـ "text" عادي وكانت خارج نافذة الـ 24 ساعة الخاصة بمحادثة عميل حقيقية،
// ميتا هترفضها. لازم تعمل Message Template وتاخدله موافقة من Meta، وتحط
// WHATSAPP_MESSAGE_MODE=template + اسم القالب. الوضع النصي (text) مفيد للتجربة بس.

function normalizePhone(phone) {
  return String(phone).replace(/[^\d]/g, '');
}

async function sendWhatsappMessage(toPhone, messageText) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

  if (!token || !phoneNumberId) {
    throw new Error('إعدادات واتساب ناقصة: WHATSAPP_TOKEN أو WHATSAPP_PHONE_NUMBER_ID مش موجودين في الـ environment');
  }

  const mode = process.env.WHATSAPP_MESSAGE_MODE || 'text';
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  let body;
  if (mode === 'template') {
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'ar';
    if (!templateName) {
      throw new Error('WHATSAPP_TEMPLATE_NAME مطلوب لما WHATSAPP_MESSAGE_MODE=template');
    }
    const hasVariable = process.env.WHATSAPP_TEMPLATE_HAS_VARIABLE !== 'false';

    body = {
      messaging_product: 'whatsapp',
      to: normalizePhone(toPhone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
        ...(hasVariable
          ? {
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: messageText }],
                },
              ],
            }
          : {}),
      },
    };
  } else {
    body = {
      messaging_product: 'whatsapp',
      to: normalizePhone(toPhone),
      type: 'text',
      text: { body: messageText },
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = data?.error?.message || `فشل إرسال رسالة واتساب (status ${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

module.exports = { sendWhatsappMessage };
