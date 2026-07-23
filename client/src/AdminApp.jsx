import { useEffect, useState } from 'react';
import AdminLogin from './components/AdminLogin';
import ClientsSettings from './components/ClientsSettings';
import AdminUsersManager from './components/AdminUsersManager';
import { getStoredAdminAuth, verifyAdminSession, logoutAdmin } from './api';
import logo from './logo.png';

// صفحة الأدمن - منفصلة تمامًا عن صفحة اليوزر (client/src/App.jsx). مفيش أي
// رابط أو تاب في صفحة اليوزر بيوصل هنا؛ الوصول بس عن طريق فتح /admin مباشرة.
export default function AdminApp() {
  const [adminAuth, setAdminAuth] = useState(() => getStoredAdminAuth());
  const [checkingSession, setCheckingSession] = useState(true);
  const [tab, setTab] = useState('clients'); // 'clients' | 'admins'

  useEffect(() => {
    verifyAdminSession()
      .then((auth) => setAdminAuth(auth))
      .finally(() => setCheckingSession(false));

    function handleExpired() {
      setAdminAuth(null);
    }
    window.addEventListener('admin-auth-expired', handleExpired);
    return () => window.removeEventListener('admin-auth-expired', handleExpired);
  }, []);

  function handleLogout() {
    logoutAdmin();
    setAdminAuth(null);
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="brand-header">
          <img src={logo} alt="Stock Watcher" className="brand-logo" />
          <div>
            <h1>Stock Watcher — لوحة التحكم</h1>
            <p className="brand-subtitle">
              {adminAuth ? `مسجل دخول: ${adminAuth.admin.username}` : 'دخول الأدمن'}
            </p>
          </div>
        </header>

        {checkingSession ? (
          <p className="hint">جارٍ التحقق من الجلسة...</p>
        ) : !adminAuth ? (
          <AdminLogin onLoggedIn={setAdminAuth} />
        ) : (
          <>
            <nav className="tabs">
              <button className={tab === 'clients' ? 'tab active' : 'tab'} onClick={() => setTab('clients')}>
                إعدادات العملاء
              </button>
              <button className={tab === 'admins' ? 'tab active' : 'tab'} onClick={() => setTab('admins')}>
                حسابات الأدمن
              </button>
              <button className="tab" onClick={handleLogout}>تسجيل الخروج</button>
            </nav>

            {tab === 'clients' ? <ClientsSettings /> : <AdminUsersManager />}
          </>
        )}
      </div>
    </div>
  );
}
