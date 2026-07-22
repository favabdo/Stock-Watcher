import { useEffect, useState } from 'react';
import { updateReorderQty } from '../api';

export default function ItemPanel({ item, onUpdated, onCheckStock, checking }) {
  const [reorderQty, setReorderQty] = useState(item.ReorderQty ?? 0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setReorderQty(item.ReorderQty ?? 0);
    setMsg('');
  }, [item.ID]);

  async function handleSave() {
    setSaving(true);
    setMsg('');
    try {
      const updated = await updateReorderQty(item.ID, Number(reorderQty));
      onUpdated(updated);
      setMsg('تم حفظ الحد بنجاح ✅');
    } catch (err) {
      setMsg('خطأ: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="item-panel">
      <h2>{item.Name_Ar || item.Name_En}</h2>

      <div className="field">
        <label>الكود</label>
        <input value={item.Code || ''} disabled />
      </div>

      <div className="field">
        <label>حد إعادة الطلب (ReorderQty)</label>
        <input
          type="number"
          step="any"
          value={reorderQty}
          onChange={(e) => setReorderQty(e.target.value)}
        />
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ الحد'}
        </button>
        <button className="btn-check" onClick={onCheckStock} disabled={checking}>
          {checking ? 'جاري التشيك...' : 'تشيك الاستوك الآن'}
        </button>
      </div>

      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
