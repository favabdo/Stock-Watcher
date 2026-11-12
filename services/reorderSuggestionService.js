// معادلة v1 مقترحة لكمية إعادة الطلب. لا توجد سرعة بيع/Lead time في
// البيانات الحالية، فالمعادلة مبنية على MaxQty وإن لم يوجد فعلى ReorderQty.
// الهدف: اقتراح قابل للتفسير وليس تنبؤًا بالمبيعات.
function computeReorderSuggestion({ stock, reorderQty, minQty, maxQty }) {
  const s = Number(stock) || 0;
  const reorder = Number(reorderQty) || 0;
  const min = Number(minQty) || 0;
  const max = Number(maxQty) || 0;

  if (max > 0) return Math.max(0, Math.ceil(max - s));
  if (reorder > 0) return Math.max(0, Math.ceil(2 * reorder - s));
  if (min > 0) return Math.max(0, Math.ceil(min - s));
  return 0;
}

module.exports = { computeReorderSuggestion };
