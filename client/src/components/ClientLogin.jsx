import { useState } from 'react';
import { loginClient } from '../api';

export default function ClientLogin({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const data = await loginClient(username.trim(), password);
      onLoggedIn(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-card">
      <h2>تسجيل الدخول</h2>
      <p className="hint">أدخل بيانات الدخول الخاصة بك لعرض بيانات مخزونك.</p>
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
