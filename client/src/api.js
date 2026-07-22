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

export async function checkStock(id) {
  const res = await fetch(`${BASE}/${id}/check-stock`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل التشيك');
  return data;
}
