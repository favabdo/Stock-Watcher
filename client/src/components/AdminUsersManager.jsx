import { useEffect, useState } from 'react';
import { listAdmins, createAdminUser } from '../api';

export default function AdminUsersManager() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setAdmins(await listAdmins());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    setFormError('');
    setSuccessMsg('');
    if (!username.trim() || !password) {
      setFormError('لازم تكتب يوزر وباسورد');
      return;
    }
    if (password.length < 6) {
      setFormError('الباسورد لازم يكون 6 حروف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('الباسورد وتأكيد الباسورد مش متطابقين');
      return;
    }
    setSaving(true);
    try {
      await createAdminUser(username.trim(), password);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg('تم إضافة الأدمن الجديد بنجاح، يقدر يسجل دخول دلوقتي.');
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>حسابات الأدمن</h2>
      </div>

      <div className="client-form">
        <h3>إضافة أدمن جديد</h3>
        <div className="field">
          <label>اسم المستخدم</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثال: ahmed_admin" />
        </div>
        <div className="field-row">
          <div className="field">
            <label>كلمة المرور</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
        </div>
        {formError && <p className="error-text">{formError}</p>}
        {successMsg && <p className="hint">{successMsg}</p>}
        <div className="actions">
          <button onClick={handleAdd} disabled={saving}>
            {saving ? 'جارٍ الإضافة...' : 'إضافة أدمن'}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="hint">جارٍ التحميل...</p>}

      <div className="clients-list">
        {admins.map((admin) => (
          <div key={admin.id} className="client-card">
            <div className="client-card-header">
              <div className="client-card-title">
                <strong>{admin.username}</strong>
              </div>
            </div>
            <p className="client-meta">
              تم الإنشاء: {admin.createdAt ? new Date(admin.createdAt).toLocaleString('ar-EG') : '-'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
