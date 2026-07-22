export default function CheckResults({ data }) {
  if (!data) return null;

  const { item, checkedBranches, belowThreshold } = data;
  const belowMap = new Map(belowThreshold.map((b) => [b.branchID, b.row]));

  return (
    <div className="check-results">
      <h3>نتيجة التشيك على كل الفروع</h3>
      <p>
        {belowThreshold.length > 0
          ? `⚠️ الصنف تحت حد إعادة الطلب في ${belowThreshold.length} فرع من أصل ${checkedBranches.length}`
          : `✅ الصنف فوق حد إعادة الطلب في كل الفروع (${checkedBranches.length} فرع)`}
      </p>

      <table>
        <thead>
          <tr>
            <th>الفرع</th>
            <th>الاستوك الحالي</th>
            <th>حد إعادة الطلب</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {checkedBranches.map((branchID) => {
            const row = belowMap.get(branchID);
            return (
              <tr key={branchID}>
                <td>{branchID}</td>
                <td>{row ? row.Stock : '-'}</td>
                <td>{item.ReorderQty}</td>
                <td className={row ? 'status-alert' : 'status-ok'}>
                  {row ? 'تحت الحد' : 'طبيعي'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="hint">
        * التفاصيل بتتطبع كمان في تيرمينال السيرفر (Console) مؤقتًا لحد ما نحدد شكل الإشعار النهائي.
      </p>
    </div>
  );
}
