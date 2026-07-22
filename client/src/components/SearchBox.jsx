import { useState } from 'react';
import { searchItems } from '../api';

export default function SearchBox({ onSelect, onSearchStart }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!term.trim()) return;
    // بحث جديد بدأ - نبلغ الأب يخفي نتيجة تشيك الاستوك القديمة (لو موجودة)
    // بدل ما تفضل ظاهرة وهي بقت مالهاش علاقة بالبحث الجديد
    onSearchStart?.();
    setLoading(true);
    setError('');
    try {
      const items = await searchItems(term.trim());
      setResults(items);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="search-box-wrap">
      <div className="search-box">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="ابحث بالكود أو الاسم..."
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? '...جاري البحث' : 'بحث'}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="results-list">
        {searched && !loading && !error && results.length === 0 && (
          <div className="result-item muted">مفيش نتائج</div>
        )}
        {results.map((item) => (
          <div key={item.ID} className="result-item" onClick={() => onSelect(item)}>
            <span>{item.Code} - {item.Name_Ar || item.Name_En || ''}</span>
            <span>حد: {item.ReorderQty ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
