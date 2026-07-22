import { useEffect, useState } from 'react';
import { getLowStockItems } from '../api';

export default function LowStockList({ onSelect }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getLowStockItems();
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="low-stock-wrap">
      <div className="low-stock-header">
        <div className="low-stock-header-title">
          <h3>الأصناف التي بلغت حد إعادة الطلب</h3>
          {!loading && !error && <span className="badge badge-danger">{rows.length}</span>}
        </div>
        <button className="btn-refresh" onClick={load} disabled={loading}>
          {loading ? 'جارٍ التحديث...' : 'تحديث'}
        </button>
      </div>

      {loading && (
        <div className="skeleton-list" aria-label="جارٍ تحميل الأصناف" role="status">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <p className="error-text">{error}</p>
          <button onClick={load} style={{ marginTop: 8 }}>إعادة المحاولة</button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="empty-state">
          <svg className="empty-state-icon success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12.5l2.2 2.2L16 9.5" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <p className="empty-state-title">لا توجد أصناف تحت حد إعادة الطلب حاليًا</p>
          <p className="empty-state-desc">جميع الأصناف فوق الحد المسموح به في كل الفروع.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="results-list">
          {rows.map(({ item, branches }) => (
            <div key={item.ID} className="result-item low-stock-item" onClick={() => onSelect(item)}>
              <span className="result-item-name">
                <span className="result-item-code">{item.Code}</span>
                {' — '}
                {item.Name_Ar || item.Name_En || ''}
              </span>
              <span className="result-item-meta">
                <span className="status-dot dot-danger" aria-hidden="true" />
                {branches.length} فرع تحت الحد ({item.ReorderQty ?? 0})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
