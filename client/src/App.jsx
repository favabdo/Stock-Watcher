import { useEffect, useState } from 'react';
import SearchBox from './components/SearchBox';
import LowStockList from './components/LowStockList';
import ItemPanel from './components/ItemPanel';
import CheckResults from './components/CheckResults';
import ClientsSettings from './components/ClientsSettings';
import ClientLogin from './components/ClientLogin';
import { checkStock, getStoredClientAuth, verifyClientSession, logoutClient } from './api';
import logo from './logo.png';

export default function App() {
  const [view, setView] = useState('main'); // 'main' | 'settings'
  const [clientAuth, setClientAuth] = useState(() => getStoredClientAuth());
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [checkData, setCheckData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  // Role 0 = شايف الرئيسية والإعدادات مع بعض، Role 1 = شايف الرئيسية بس
  const canSeeSettings = !clientAuth || (clientAuth.client.role ?? 0) === 0;

  // لو العميل مش شايف تاب الإعدادات (Role 1) وكان فاتحه قبل كده، رجّعه للرئيسية
  useEffect(() => {
    if (!canSeeSettings && view === 'settings') {
      setView('main');
    }
  }, [canSeeSettings, view]);

  // أول ما التطبيق يفتح، بيتأكد إن جلسة الدخول المخزنة (لو موجودة) لسه صالحة
  useEffect(() => {
    verifyClientSession()
      .then((auth) => setClientAuth(auth))
      .finally(() => setCheckingSession(false));

    function handleExpired() {
      setClientAuth(null);
    }
    window.addEventListener('client-auth-expired', handleExpired);
    return () => window.removeEventListener('client-auth-expired', handleExpired);
  }, []);

  function handleSelect(item) {
    setSelectedItem(item);
    setCheckData(null);
    setCheckError('');
  }

  // بيتنده أول ما المستخدم يبدأ بحث جديد (زرار بحث أو Enter) - قبل ما نعرف
  // نتيجة البحث حتى. بيخفي نتيجة تشيك الاستوك بتاعة الصنف القديم فورًا، عشان
  // مايفضلش ظاهر تحت نتايج البحث الجديدة وهو بيتكلم عن صنف تاني خالص.
  function handleSearchStart() {
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

  function handleLogout() {
    logoutClient();
    setClientAuth(null);
    setSelectedItem(null);
    setCheckData(null);
  }

  return (
    <div className="container">
      <header className="brand-header">
        <img src={logo} alt="Stock Watcher" className="brand-logo" />
        <div>
          <h1>Stock Watcher</h1>
          <p className="brand-subtitle">
            {clientAuth ? clientAuth.client.clientName : 'إدارة حد إعادة الطلب (ReorderQty)'}
          </p>
        </div>
      </header>

      <nav className="tabs">
        <button className={view === 'main' ? 'tab active' : 'tab'} onClick={() => setView('main')}>الرئيسية</button>
        {canSeeSettings && (
          <button className={view === 'settings' ? 'tab active' : 'tab'} onClick={() => setView('settings')}>الإعدادات</button>
        )}
        {clientAuth && view === 'main' && (
          <button className="tab" onClick={handleLogout}>خروج</button>
        )}
      </nav>

      {view === 'main' ? (
        checkingSession ? (
          <p className="hint">جاري التحقق من الجلسة...</p>
        ) : !clientAuth ? (
          <ClientLogin onLoggedIn={setClientAuth} />
        ) : (
          <>
            <LowStockList onSelect={handleSelect} />

            <SearchBox onSelect={handleSelect} onSearchStart={handleSearchStart} />

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
        )
      ) : (
        <ClientsSettings />
      )}
    </div>
  );
}
