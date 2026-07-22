import { useState } from 'react';
import SearchBox from './components/SearchBox';
import ItemPanel from './components/ItemPanel';
import CheckResults from './components/CheckResults';
import { checkStock } from './api';
import logo from './logo.png';

export default function App() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [checkData, setCheckData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  function handleSelect(item) {
    setSelectedItem(item);
    setCheckData(null);
    setCheckError('');
  }

  function handleUpdated(updated) {
    setSelectedItem(updated);
  }

  async function handleCheckStock() {
    if (!selectedItem) return;
    setChecking(true);
    setCheckError('');
    try {
      const data = await checkStock(selectedItem.ID);
      setCheckData(data);
    } catch (err) {
      setCheckError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="container">
      <header className="brand-header">
        <img src={logo} alt="Stock Watcher" className="brand-logo" />
        <div>
          <h1>Stock Watcher</h1>
          <p className="brand-subtitle">إدارة حد إعادة الطلب (ReorderQty)</p>
        </div>
      </header>

      <SearchBox onSelect={handleSelect} />

      {selectedItem && (
        <ItemPanel
          item={selectedItem}
          onUpdated={handleUpdated}
          onCheckStock={handleCheckStock}
          checking={checking}
        />
      )}

      {checkError && <p className="error-text">{checkError}</p>}
      <CheckResults data={checkData} />
    </div>
  );
}
