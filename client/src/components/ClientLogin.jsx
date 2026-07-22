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
    <div className="settings-login">
      <h2>تسجيل الدخول</h2>
      <p className="hint">ادخل باليوزر والباسورد اللي معاك عشان تشوف بياناتك.</p>
      <div className="field">
        <label>اليوزر</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
      </div>
      <div className="field">
        <label>الباسورد</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button onClick={handleLogin} disabled={loading}>{loading ? 'جاري الدخول...' : 'دخول'}</button>
    </div>
  );
}
