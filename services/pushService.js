// إرسال Push عبر Firebase Cloud Messaging HTTP v1.
// الإعدادات:
//   PUSH_ENABLED=true
//   FCM_PROJECT_ID=...
//   FCM_SERVICE_ACCOUNT_JSON_B64=<base64 لملف service account>
//
// لا نحفظ ملف الـ service account في الريبو. لو الإعدادات ناقصة الدالة
// بترجع skipped بدل ما ترمي استثناء يوقف دورة التنبيهات كلها.

let cachedClient = null;
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function parseServiceAccount() {
  const b64 = process.env.FCM_SERVICE_ACCOUNT_JSON_B64;
  if (b64) {
    try {
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch (err) {
      throw new Error('FCM_SERVICE_ACCOUNT_JSON_B64 غير صالح (مش JSON base64)');
    }
  }
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (raw) return JSON.parse(raw);
  return null;
}

function isConfigured() {
  return process.env.PUSH_ENABLED === 'true' && !!process.env.FCM_PROJECT_ID && !!(process.env.FCM_SERVICE_ACCOUNT_JSON_B64 || process.env.FCM_SERVICE_ACCOUNT_JSON);
}

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  let GoogleAuth;
  try {
    ({ GoogleAuth } = require('google-auth-library'));
  } catch (err) {
    throw new Error('google-auth-library مش مثبتة على السيرفر');
  }

  const credentials = parseServiceAccount();
  if (!credentials) throw new Error('FCM service account مش متظبط');

  if (!cachedClient) {
    cachedClient = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }

  const client = await cachedClient.getClient();
  const result = await client.getAccessToken();
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) throw new Error('فشل الحصول على FCM access token');

  cachedToken = token;
  // Google tokens usually last 1h; refresh after 50 minutes.
  cachedTokenExpiresAt = Date.now() + 50 * 60 * 1000;
  return token;
}

async function sendToToken(pushToken, { title, body, data = {}, collapseKey = null } = {}) {
  if (!isConfigured()) {
    return { ok: false, skipped: true, errorCode: 'PUSH_DISABLED' };
  }
  if (!pushToken) {
    return { ok: false, skipped: true, errorCode: 'EMPTY_TOKEN' };
  }

  const projectId = process.env.FCM_PROJECT_ID;
  const accessToken = await getAccessToken();
  const message = {
    message: {
      token: pushToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        ...(collapseKey ? { collapse_key: collapseKey } : {}),
        notification: {
          channel_id: 'stock_alerts',
          sound: 'default',
        },
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload?.error?.details || [];
    const errorCode =
      details.find((d) => d.errorCode)?.errorCode ||
      payload?.error?.status ||
      `HTTP_${response.status}`;
    const serialized = JSON.stringify(payload);
    return {
      ok: false,
      status: response.status,
      errorCode,
      error: payload?.error?.message || `FCM error ${response.status}`,
      unregistered: response.status === 404 || /UNREGISTERED|NOT_FOUND/.test(serialized),
    };
  }

  return { ok: true, name: payload.name || null };
}

module.exports = { sendToToken, isConfigured };
