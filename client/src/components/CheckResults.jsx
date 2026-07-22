export default function CheckResults({ data }) {
  if (!data) return null;

  const { itemcode, stores, belowThreshold, whatsapp } = data;

  return (
    <div className="check-results">
      <h3>نتيجة التشيك على كل المخازن</h3>
      <p>
        {belowThreshold.length > 0
          ? `⚠️ الصنف ${itemcode} وصل لحد إعادة الطلب أو أقل في ${belowThreshold.length} مخزن من أصل ${stores.length}`
          : `✅ الصنف ${itemcode} فوق حد إعادة الطلب في كل المخازن (${stores.length} مخزن)`}
      </p>

      {whatsapp && (
        whatsapp.sent
          ? <p className="hint">✅ اتبعتت رسالة واتساب تنبيه</p>
          : <p className="error-text">⚠️ فشل إرسال رسالة الواتساب: {whatsapp.error}</p>
      )}

      <table>
        <thead>
          <tr>
            <th>المخزن</th>
            <th>الاستوك الحالي</th>
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
              <td className={s.belowThreshold ? 'status-alert' : 'status-ok'}>
                {s.belowThreshold ? 'تحت الحد' : 'طبيعي'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
