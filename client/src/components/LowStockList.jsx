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

  if (loading) {
    return <div className="low-stock-wrap"><p className="muted">جاري تحميل المنتجات اللي وصلت لحد الطلب...</p></div>;
  }

  if (error) {
    return (
      <div className="low-stock-wrap">
        <p className="error-text">{error}</p>
        <button onClick={load}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="low-stock-wrap">
      <div className="low-stock-header">
        <h3>منتجات وصلت لحد إعادة الطلب ({rows.length})</h3>
        <button className="btn-refresh" onClick={load}>تحديث</button>
      </div>

      {rows.length === 0 ? (
        <p className="muted">مفيش أي منتج وصل لحد إعادة الطلب دلوقتي ✅</p>
      ) : (
        <div className="results-list">
          {rows.map(({ item, branches }) => (
            <div key={item.ID} className="result-item low-stock-item" onClick={() => onSelect(item)}>
              <span>{item.Code} - {item.Name_Ar || item.Name_En || ''}</span>
              <span className="status-alert">
                {branches.length} فرع تحت الحد ({item.ReorderQty ?? 0})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
