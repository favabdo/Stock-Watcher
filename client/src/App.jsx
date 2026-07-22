import { useState } from 'react';
import SearchBox from './components/SearchBox';
import LowStockList from './components/LowStockList';
import ItemPanel from './components/ItemPanel';
import CheckResults from './components/CheckResults';
import ClientsSettings from './components/ClientsSettings';
import { checkStock } from './api';
import logo from './logo.png';

export default function App() {
  const [view, setView] = useState('main'); // 'main' | 'settings'
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

      <nav className="tabs">
        <button className={view === 'main' ? 'tab active' : 'tab'} onClick={() => setView('main')}>الرئيسية</button>
        <button className={view === 'settings' ? 'tab active' : 'tab'} onClick={() => setView('settings')}>الإعدادات</button>
      </nav>

      {view === 'main' ? (
        <>
          <LowStockList onSelect={handleSelect} />

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
        </>
      ) : (
        <ClientsSettings />
      )}
    </div>
  );
}
