export default function CheckResults({ data }) {
  if (!data) return null;

  const { item, itemcode, stores, belowThreshold, whatsapp } = data;
  const isBelow = belowThreshold.length > 0;

  return (
    <div className="check-results">
      <h3>نتيجة التحقق على كل المخازن</h3>

      <p className="result-item-name">
        <span className="result-item-code">{item?.Code ?? itemcode}</span>
        {' — '}
        {item?.Name_Ar || item?.Name_En || ''}
      </p>

      <p className="check-summary">
        <span className={`status-dot ${isBelow ? 'dot-danger' : 'dot-success'}`} aria-hidden="true" />
        {isBelow
          ? `الصنف ${itemcode} بلغ حد إعادة الطلب أو أقل في ${belowThreshold.length} مخزن من أصل ${stores.length}`
          : `الصنف ${itemcode} فوق حد إعادة الطلب في جميع المخازن (${stores.length} مخزن)`}
      </p>

      {whatsapp && (
        whatsapp.sent
          ? <p className="hint">تم إرسال رسالة تنبيه عبر واتساب بنجاح ✅</p>
          : <p className="error-text">تعذّر إرسال رسالة واتساب: {whatsapp.error}</p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>المخزن</th>
              <th>الرصيد الحالي</th>
              <th>حد إعادة الطلب</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.storeid}>
                <td>{s.storename}</td>
                <td>{s.transpkgqty1}</td>
                <td>{s.reorderQty}</td>
                <td>
                  <span className={`badge ${s.belowThreshold ? 'badge-danger' : 'badge-success'}`}>
                    {s.belowThreshold ? 'تحت الحد' : 'طبيعي'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
