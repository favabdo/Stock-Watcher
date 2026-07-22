const BASE = '/api/items';

// ============ تسجيل دخول العميل ============
const CLIENT_AUTH_KEY = 'stockWatcherClientAuth';

export function getStoredClientAuth() {
  const saved = localStorage.getItem(CLIENT_AUTH_KEY);
  return saved ? JSON.parse(saved) : null;
}

function clientAuthHeaders() {
  const auth = getStoredClientAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

export async function loginClient(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');
  localStorage.setItem(CLIENT_AUTH_KEY, JSON.stringify(data));
  return data;
}

export function logoutClient() {
  localStorage.removeItem(CLIENT_AUTH_KEY);
}

// بيتأكد إن جلسة الدخول المخزنة لسه صالحة (بيتنده بيه أول ما التطبيق يفتح)
export async function verifyClientSession() {
  const auth = getStoredClientAuth();
  if (!auth?.token) return null;
  const res = await fetch('/api/auth/me', { headers: clientAuthHeaders() });
  if (!res.ok) {
    logoutClient();
    return null;
  }
  return auth;
}

async function itemsFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...clientAuthHeaders() },
  });
  if (res.status === 401) {
    logoutClient();
    window.dispatchEvent(new Event('client-auth-expired'));
  }
  return res;
}

export async function searchItems(q) {
  const res = await itemsFetch(`${BASE}/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('فشل البحث');
  return res.json();
}

export async function getItem(id) {
  const res = await itemsFetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('الصنف غير موجود');
  return res.json();
}

export async function updateReorderQty(id, reorderQty) {
  const res = await itemsFetch(`${BASE}/${id}/reorder-qty`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reorderQty }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
  return data;
}

export async function getLowStockItems() {
  const res = await itemsFetch(`${BASE}/low-stock`);
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(data.error || 'فشل تحميل قائمة المخزون المنخفض');
  return data;
}

export async function checkStock(id) {
  const res = await itemsFetch(`${BASE}/${id}/check-stock`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل التشيك');
  return data;
}

// ============ إدارة العملاء (Multi-tenant Settings) ============
const CLIENTS_BASE = '/api/clients';

function authHeaders(auth) {
  if (!auth || !auth.user) return {};
  const encoded = btoa(`${auth.user}:${auth.pass}`);
  return { Authorization: `Basic ${encoded}` };
}

async function handleClientsResponse(res) {
  if (res.status === 401) {
    throw new Error('يوزر أو باسورد الإعدادات غلط');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حصل خطأ');
  return data;
}

export async function listClients(auth) {
  const res = await fetch(CLIENTS_BASE, { headers: { ...authHeaders(auth) } });
  return handleClientsResponse(res);
}

export async function createClient(auth, payload) {
  const res = await fetch(CLIENTS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(auth) },
    body: JSON.stringify(payload),
  });
  return handleClientsResponse(res);
}

export async function updateClient(auth, id, payload) {
  const res = await fetch(`${CLIENTS_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(auth) },
    body: JSON.stringify(payload),
  });
  return handleClientsResponse(res);
}

export async function deleteClient(auth, id) {
  const res = await fetch(`${CLIENTS_BASE}/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders(auth) },
  });
  return handleClientsResponse(res);
}

export async function checkClientNow(auth, id) {
  const res = await fetch(`${CLIENTS_BASE}/${id}/check-now`, {
    method: 'POST',
    headers: { ...authHeaders(auth) },
  });
  return handleClientsResponse(res);
}
