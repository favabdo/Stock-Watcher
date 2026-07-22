const BASE = '/api/items';

export async function searchItems(q) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('فشل البحث');
  return res.json();
}

export async function getItem(id) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('الصنف غير موجود');
  return res.json();
}

export async function updateReorderQty(id, reorderQty) {
  const res = await fetch(`${BASE}/${id}/reorder-qty`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reorderQty }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
  return data;
}

export async function getLowStockItems() {
  const res = await fetch(`${BASE}/low-stock`);
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(data.error || 'فشل تحميل قائمة المخزون المنخفض');
  return data;
}

export async function checkStock(id) {
  const res = await fetch(`${BASE}/${id}/check-stock`, { method: 'POST' });
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
