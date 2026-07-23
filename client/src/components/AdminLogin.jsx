import { useState } from 'react';
import { loginAdmin } from '../api';

export default function AdminLogin({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const data = await loginAdmin(username.trim(), password);
      onLoggedIn(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-card">
      <h2>دخول لوحة التحكم</h2>
      <p className="hint">الصفحة دي مخصصة للأدمن بس.</p>
      <div className="field">
        <label>اسم المستخدم</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          autoFocus
        />
      </div>
      <div className="field">
        <label>كلمة المرور</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
      </button>
    </div>
  );
}
