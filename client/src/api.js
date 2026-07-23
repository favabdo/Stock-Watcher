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

// ============ تسجيل دخول الأدمن (لوحة تحكم /admin - منفصلة تمامًا عن اليوزر) ============
const ADMIN_AUTH_KEY = 'stockWatcherAdminAuth';

export function getStoredAdminAuth() {
  const saved = localStorage.getItem(ADMIN_AUTH_KEY);
  return saved ? JSON.parse(saved) : null;
}

function adminAuthHeaders() {
  const auth = getStoredAdminAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

export async function loginAdmin(username, password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(data));
  return data;
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
}

// بيتأكد إن جلسة الأدمن المخزنة لسه صالحة (بيتنده بيه أول ما لوحة التحكم تفتح)
export async function verifyAdminSession() {
  const auth = getStoredAdminAuth();
  if (!auth?.token) return null;
  const res = await fetch('/api/admin/me', { headers: adminAuthHeaders() });
  if (!res.ok) {
    logoutAdmin();
    return null;
  }
  return auth;
}

async function adminFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...adminAuthHeaders() },
  });
  if (res.status === 401) {
    logoutAdmin();
    window.dispatchEvent(new Event('admin-auth-expired'));
  }
  return res;
}

async function handleAdminResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حصل خطأ');
  return data;
}

// ============ إدارة حسابات الأدمن نفسها ============
export async function listAdmins() {
  const res = await adminFetch('/api/admin/admins');
  return handleAdminResponse(res);
}

export async function createAdminUser(username, password) {
  const res = await adminFetch('/api/admin/admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleAdminResponse(res);
}

// ============ إدارة العملاء (Multi-tenant Settings) ============
const CLIENTS_BASE = '/api/clients';

export async function listClients() {
  const res = await adminFetch(CLIENTS_BASE);
  return handleAdminResponse(res);
}

export async function createClient(payload) {
  const res = await adminFetch(CLIENTS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleAdminResponse(res);
}

export async function updateClient(id, payload) {
  const res = await adminFetch(`${CLIENTS_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleAdminResponse(res);
}

export async function deleteClient(id) {
  const res = await adminFetch(`${CLIENTS_BASE}/${id}`, { method: 'DELETE' });
  return handleAdminResponse(res);
}

export async function checkClientNow(id) {
  const res = await adminFetch(`${CLIENTS_BASE}/${id}/check-now`, { method: 'POST' });
  return handleAdminResponse(res);
}
