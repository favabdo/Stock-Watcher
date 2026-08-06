import { useEffect, useRef, useState } from 'react';
import { getOverCreditLimitCustomers } from '../api';

const AUTO_REFRESH_MS = 5000; // نفس معدل تحديث "الأصناف التي بلغت حد إعادة الطلب"

// نفس فكرة LowStockList.jsx بالظبط، بس لتنبيهات تجاوز الحد الائتماني بدل
// نقص الاستوك. بيتعرض بس لو العميل مفعّل عنده تنبيه الحد الائتماني
// (App.jsx بيتأكد من الشرط ده قبل ما يعرض الكومبوننت أصلًا).
export default function CreditLimitList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFetchingRef = useRef(false);

  async function load({ silent = false } = {}) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await getOverCreditLimitCustomers();
      setRows(data);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let intervalId = null;

    function startPolling() {
      if (intervalId) return;
      intervalId = setInterval(() => load({ silent: true }), AUTO_REFRESH_MS);
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling();
      } else {
        load({ silent: true });
        startPolling();
      }
    }

    if (!document.hidden) startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="low-stock-wrap">
      <div className="low-stock-header">
        <div className="low-stock-header-title">
          <h3>العملاء المتجاوزون الحد الائتماني</h3>
          {!loading && !error && <span className="badge badge-danger">{rows.length}</span>}
        </div>
        <button className="btn-refresh" onClick={load} disabled={loading}>
          {loading ? 'جارٍ التحديث...' : 'تحديث'}
        </button>
      </div>

      {loading && (
        <div className="skeleton-list" aria-label="جارٍ تحميل قائمة تجاوز الحد الائتماني" role="status">
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
          <p className="empty-state-title">لا يوجد عملاء متجاوزون للحد الائتماني حاليًا</p>
          <p className="empty-state-desc">جميع الأرصدة ضمن الحد الائتماني المسموح به.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="results-list">
          {rows.map(({ customer, branches }) => (
            <div key={customer.id} className="low-stock-item-block">
              <div className="result-item low-stock-item">
                <span className="result-item-name">
                  <span className="result-item-code">{customer.code || customer.id}</span>
                  {' — '}
                  {customer.name || ''}
                </span>
                <span className="result-item-meta">
                  <span className="status-dot dot-danger" aria-hidden="true" />
                  {branches.length} فرع متجاوز
                </span>
              </div>

              <div className="low-stock-detail">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>الفرع</th>
                        <th>الرصيد الحالي</th>
                        <th>الحد الائتماني</th>
                        <th>مقدار التجاوز</th>
                        <th>آخر دفعة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b, i) => (
                        <tr key={`${b.branchId ?? 'na'}-${i}`}>
                          <td>{b.branchName || b.branchId || '-'}</td>
                          <td>{b.balance}</td>
                          <td>{b.creditLimit}</td>
                          <td>
                            <span className="badge badge-danger">{b.overAmount}</span>
                          </td>
                          <td>
                            {b.lastPaidAmount ? `${b.lastPaidAmount} (${b.lastPaidDate || '-'})` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
