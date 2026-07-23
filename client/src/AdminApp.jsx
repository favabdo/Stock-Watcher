import { useEffect, useState } from 'react';
import AdminLogin from './components/AdminLogin';
import ClientsSettings from './components/ClientsSettings';
import AdminUsersManager from './components/AdminUsersManager';
import ThemeToggle from './components/ThemeToggle';
import useTheme from './hooks/useTheme';
import { getStoredAdminAuth, verifyAdminSession, logoutAdmin } from './api';
import logo from './logo.png';

// صفحة الأدمن - منفصلة تمامًا عن صفحة اليوزر (client/src/App.jsx). مفيش أي
// رابط أو تاب في صفحة اليوزر بيوصل هنا؛ الوصول بس عن طريق فتح /admin مباشرة.
export default function AdminApp() {
  const { theme, toggleTheme } = useTheme();
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
          <div className="brand-header-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {adminAuth && (
              <button
                type="button"
                className="theme-toggle logout-btn"
                onClick={handleLogout}
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
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
            </nav>

            {tab === 'clients' ? <ClientsSettings /> : <AdminUsersManager />}
          </>
        )}
      </div>
    </div>
  );
}
