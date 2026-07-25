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
  console.log("========== WHATSAPP PAYLOAD ==========");
  console.log(JSON.stringify(body, null, 2));
  console.log("======================================");
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  console.log("========== META RESPONSE ==========");
  console.log(JSON.stringify(data, null, 2));
  console.log("==================================");
  if (!res.ok) {
    const errMsg = data?.error?.message || `فشل إرسال رسالة واتساب (status ${res.status})`;
    const errCode = data?.error?.code;
    const errSubcode = data?.error?.error_subcode;
    const errType = data?.error?.type;
    throw new Error(`${errMsg}${errType ? ` [type=${errType}]` : ''}${errCode ? ` [code=${errCode}]` : ''}${errSubcode ? ` [subcode=${errSubcode}]` : ''}`);
  }

  return data;
}

// الأرقام دلوقتي ممكن تتخزن بشكلين في عمود WhatsappPhone:
//   - الشكل الجديد: JSON زي [{"phone":"201012345678","enabled":true}, ...]
//     بيسمح إن كل رقم يتفعّل/يتعطّل لوحده.
//   - الشكل القديم (قبل ميزة التعطيل): نص عادي رقم أو أرقام مفصولة بفاصلة/
//     فاصلة منقوطة/سطر جديد - بيتعامل معاه كأن كل الأرقام دي مفعّلة.
function parsePhoneEntries(phonesRaw) {
  const raw = String(phonesRaw || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => ({ phone: String(p.phone || '').trim(), enabled: p.enabled !== false }))
        .filter((p) => p.phone);
    }
  } catch (err) {
    // مش JSON - يبقى الشكل القديم، هنكمل تحت
  }

  return raw
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((phone) => ({ phone, enabled: true }));
}

// بيرجع الأرقام المفعّلة بس (اللي مش متعطلة) كمصفوفة نصوص، جاهزة للإرسال عليها.
function parsePhoneList(phones) {
  return parsePhoneEntries(phones)
    .filter((p) => p.enabled)
    .map((p) => p.phone);
}

// بتبعت نفس رسالة التنبيه لكل الأرقام "المفعّلة" بتاعة العميل (بيتجاهل أي رقم
// اتعمله تعطيل). لو رقم فشل إرساله، الباقي بيكمل عادي، والنتيجة بترجع تفاصيل
// كل رقم على حدة عشان تقدر تعرف مين نجح ومين فشل.
async function sendWhatsappMessageToMany(phones, messageText) {
  const phoneList = parsePhoneList(phones);
  if (phoneList.length === 0) {
    throw new Error('مفيش أي رقم واتساب مفعّل للعميل ده لإرسال التنبيه عليه');
  }

  const results = await Promise.all(
    phoneList.map(async (phone) => {
      try {
        await sendWhatsappMessage(phone, messageText);
        return { phone, sent: true };
      } catch (err) {
        return { phone, sent: false, error: err.message };
      }
    })
  );

  return {
    sent: results.some((r) => r.sent), // نجح لو رقم واحد على الأقل اتبعتله
    allSent: results.every((r) => r.sent),
    results,
  };
}

module.exports = { sendWhatsappMessage, sendWhatsappMessageToMany, parsePhoneList, parsePhoneEntries };

