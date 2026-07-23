import { useEffect, useRef, useState } from 'react';
import { getLowStockItems, checkStock } from '../api';

const AUTO_REFRESH_MS = 5000; // 5 ثواني بدل 30 - حسّيًا بيبان "لحظي" من غير عبء حقيقي على قاعدة بيانات العميل

export default function LowStockList({ onSelect }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isFetchingRef = useRef(false); // بيمنع تراكم طلبات فوق بعض لو الاستعلام أخد وقت أطول من 5 ثواني

  // الصنف اللي التفاصيل بتاعته متفتحة دلوقتي (واحد بس في نفس الوقت - أكورديون)
  const [expandedItem, setExpandedItem] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  async function load({ silent = false } = {}) {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await getLowStockItems();
      setRows(data);
      // لو الصنف المفتوح دلوقتي مبقاش موجود في نتيجة التحديث (يعني رجع فوق
      // حد إعادة الطلب)، اقفل تفاصيله تلقائيًا بدل ما يفضل ظاهر بيانات قديمة
      setExpandedItem((current) => {
        if (!current) return current;
        const stillLow = data.some(({ item }) => item.ID === current.ID);
        if (!stillLow) {
          setDetailData(null);
          setDetailError('');
          return null;
        }
        return current;
      });
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

  // تحديث تلقائي كل 5 ثواني (Live query لقاعدة بيانات العميل زي بالظبط زرار
  // "تحديث" اليدوي)، من غير ما يظهر سكيلتون التحميل في كل مرة (silent).
  // بيتوقف تمامًا لو التاب/الشاشة مش ظاهرة قدام المستخدم عشان منحمّلش قاعدة
  // بيانات العميل من غير داعي وهو مش بيتفرج، وبيرجع يحدّث فورًا أول ما يرجع.
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
        load({ silent: true }); // تحديث فوري أول ما المستخدم يرجع للتاب
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

  // بيتنده لما تدوس على أي صنف في القائمة - بيفتح/يقفل تفاصيله (زي نتيجة
  // التحقق من المخزون بالظبط) تحت الصنف نفسه مباشرة. لو دوست على صنف تاني
  // وهو صنف مختلف، بيقفل القديم ويجيب تفاصيل الجديد بدل ما يفضلوا الاتنين فاتحين.
  async function handleRowClick(item) {
    if (expandedItem?.ID === item.ID) {
      setExpandedItem(null);
      setDetailData(null);
      setDetailError('');
      return;
    }

    setExpandedItem(item);
    setDetailData(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const data = await checkStock(item.ID);
      setDetailData(data);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

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
          {rows.map(({ item, branches }) => {
            const isExpanded = expandedItem?.ID === item.ID;
            return (
              <div key={item.ID} className="low-stock-item-block">
                <div
                  className={`result-item low-stock-item${isExpanded ? ' active' : ''}`}
                  onClick={() => handleRowClick(item)}
                >
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

                {isExpanded && (
                  <div className="low-stock-detail">
                    {detailLoading && <p className="hint">جارٍ تحميل تفاصيل المخزون...</p>}

                    {!detailLoading && detailError && (
                      <p className="error-text">{detailError}</p>
                    )}

                    {!detailLoading && !detailError && detailData && (
                      <>
                        <p className="check-summary">
                          <span
                            className={`status-dot ${detailData.belowThreshold.length > 0 ? 'dot-danger' : 'dot-success'}`}
                            aria-hidden="true"
                          />
                          {detailData.belowThreshold.length > 0
                            ? `الصنف ${detailData.itemcode} بلغ حد إعادة الطلب أو أقل في ${detailData.belowThreshold.length} مخزن من أصل ${detailData.stores.length}`
                            : `الصنف ${detailData.itemcode} فوق حد إعادة الطلب في جميع المخازن (${detailData.stores.length} مخزن)`}
                        </p>

                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>المخزن</th>
                                <th>الرصيد الحالي</th>
                                <th>حد إعادة الطلب</th>
                                <th>الناقص عن الحد</th>
                                <th>الحالة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailData.stores.map((s) => {
                                const shortfall = s.belowThreshold
                                  ? Math.max(0, s.reorderQty - s.transpkgqty1)
                                  : 0;
                                return (
                                  <tr key={s.storeid}>
                                    <td>{s.storename}</td>
                                    <td>{s.transpkgqty1}</td>
                                    <td>{s.reorderQty}</td>
                                    <td>
                                      {s.belowThreshold ? (
                                        <span className="badge badge-danger">{shortfall}</span>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                    <td>
                                      <span className={`badge ${s.belowThreshold ? 'badge-danger' : 'badge-success'}`}>
                                        {s.belowThreshold ? 'تحت الحد' : 'طبيعي'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {onSelect && (
                          <button
                            type="button"
                            className="btn-edit-reorder"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(item);
                            }}
                          >
                            تعديل حد إعادة الطلب
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
