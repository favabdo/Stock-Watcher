import { useEffect, useState } from 'react';
import SearchBox from './components/SearchBox';
import LowStockList from './components/LowStockList';
import ItemPanel from './components/ItemPanel';
import CheckResults from './components/CheckResults';
import ClientLogin from './components/ClientLogin';
import ThemeToggle from './components/ThemeToggle';
import useTheme from './hooks/useTheme';
import { checkStock, getStoredClientAuth, verifyClientSession, logoutClient } from './api';
import logo from './logo.png';

// صفحة اليوزر - منفصلة تمامًا عن صفحة الأدمن (client/src/AdminApp.jsx).
// مفيش أي تاب أو زرار هنا بيوصل لإعدادات النظام أو للعملاء التانيين.
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [clientAuth, setClientAuth] = useState(() => getStoredClientAuth());
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [checkData, setCheckData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

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
    setSelectedItem(null);
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
    <div className="app-shell">
      <div className="container">
        <header className="brand-header">
          <img src={logo} alt="Stock Watcher" className="brand-logo" />
          <div>
            <h1>Stock Watcher</h1>
            <p className="brand-subtitle">
              {clientAuth ? clientAuth.client.clientName : 'إدارة حد إعادة الطلب للمخزون'}
            </p>
          </div>
          <div className="brand-header-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {clientAuth && (
          <nav className="tabs">
            <button className="tab" onClick={handleLogout}>تسجيل الخروج</button>
          </nav>
        )}

        {checkingSession ? (
          <p className="hint">جارٍ التحقق من الجلسة...</p>
        ) : !clientAuth ? (
          <ClientLogin onLoggedIn={setClientAuth} />
        ) : (
          <>
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

            <LowStockList onSelect={handleSelect} />
          </>
        )}
      </div>
    </div>
  );
}
