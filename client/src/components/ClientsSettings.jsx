import { useEffect, useState } from 'react';
import { listClients, createClient, updateClient, deleteClient, checkClientNow } from '../api';

const emptyForm = {
  clientName: '',
  dbServer: '',
  dbName: '',
  dbUser: '',
  dbPassword: '',
  dbPort: 1433,
  dbEncrypt: false,
  dbTrustServerCertificate: true,
  whatsappPhone: '',
  isActive: true,
};

export default function ClientsSettings() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('stockWatcherSettingsAuth');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null); // null = مفيش فورم مفتوح، 'new' = إضافة عميل جديد
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [checkResults, setCheckResults] = useState({}); // clientId -> result

  async function loadClients(currentAuth) {
    setLoading(true);
    setError('');
    try {
      const data = await listClients(currentAuth);
      setClients(data);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('غلط')) {
        setAuth(null);
        localStorage.removeItem('stockWatcherSettingsAuth');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (auth) loadClients(auth);
  }, [auth]);

  function handleLogin() {
    setLoginError('');
    const candidateAuth = { user: loginUser, pass: loginPass };
    listClients(candidateAuth)
      .then((data) => {
        setClients(data);
        setAuth(candidateAuth);
        localStorage.setItem('stockWatcherSettingsAuth', JSON.stringify(candidateAuth));
      })
      .catch((err) => setLoginError(err.message));
  }

  function handleLogout() {
    setAuth(null);
    localStorage.removeItem('stockWatcherSettingsAuth');
  }

  function openNewForm() {
    setForm(emptyForm);
    setEditingId('new');
  }

  function openEditForm(client) {
    setForm({ ...client, dbPassword: '' }); // الباسورد بيفضل فاضي، يتحدث بس لو كتب واحد جديد
    setEditingId(client.id);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (editingId === 'new') {
        await createClient(auth, form);
      } else {
        await updateClient(auth, editingId, form);
      }
      closeForm();
      await loadClients(auth);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client) {
    if (!confirm(`متأكد إنك عايز تمسح العميل "${client.clientName}"؟`)) return;
    try {
      await deleteClient(auth, client.id);
      await loadClients(auth);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCheckNow(client) {
    setCheckResults((prev) => ({ ...prev, [client.id]: { loading: true } }));
    try {
      const result = await checkClientNow(auth, client.id);
      setCheckResults((prev) => ({ ...prev, [client.id]: { loading: false, result } }));
    } catch (err) {
      setCheckResults((prev) => ({ ...prev, [client.id]: { loading: false, error: err.message } }));
    }
  }

  if (!auth) {
    return (
      <div className="settings-login">
        <h2>الإعدادات</h2>
        <p className="hint">محتاج تسجيل دخول عشان تدخل على إعدادات العملاء.</p>
        <div className="field">
          <label>اليوزر</label>
          <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} />
        </div>
        <div className="field">
          <label>الباسورد</label>
          <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>
        {loginError && <p className="error-text">{loginError}</p>}
        <button onClick={handleLogin}>دخول</button>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>إعدادات العملاء</h2>
        <div>
          <button onClick={openNewForm}>+ إضافة عميل</button>
          <button className="btn-secondary" onClick={handleLogout}>خروج</button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="hint">جاري التحميل...</p>}

      {editingId && (
        <div className="client-form">
          <h3>{editingId === 'new' ? 'عميل جديد' : 'تعديل عميل'}</h3>

          <div className="field">
            <label>اسم العميل</label>
            <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="مثال: نايل ستوك" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>سيرفر قاعدة البيانات</label>
              <input value={form.dbServer} onChange={(e) => setForm({ ...form, dbServer: e.target.value })} placeholder="مثال: 192.168.1.10" />
            </div>
            <div className="field">
              <label>البورت</label>
              <input type="number" value={form.dbPort} onChange={(e) => setForm({ ...form, dbPort: Number(e.target.value) })} />
            </div>
          </div>

          <div className="field">
            <label>اسم قاعدة البيانات</label>
            <input value={form.dbName} onChange={(e) => setForm({ ...form, dbName: e.target.value })} placeholder="اسم الداتا بيز اللي هيسحب منها البيانات" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>يوزر قاعدة البيانات</label>
              <input value={form.dbUser} onChange={(e) => setForm({ ...form, dbUser: e.target.value })} />
            </div>
            <div className="field">
              <label>باسورد قاعدة البيانات {editingId !== 'new' && '(سيبه فاضي لو مش هتغيره)'}</label>
              <input type="password" value={form.dbPassword} onChange={(e) => setForm({ ...form, dbPassword: e.target.value })} />
            </div>
          </div>

          <div className="field-row checkboxes">
            <label><input type="checkbox" checked={form.dbEncrypt} onChange={(e) => setForm({ ...form, dbEncrypt: e.target.checked })} /> Encrypt</label>
            <label><input type="checkbox" checked={form.dbTrustServerCertificate} onChange={(e) => setForm({ ...form, dbTrustServerCertificate: e.target.checked })} /> Trust Server Certificate</label>
            <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> نشط</label>
          </div>

          <div className="field">
            <label>رقم واتساب العميل (بصيغة دولية، مثال 201012345678)</label>
            <input value={form.whatsappPhone} onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })} placeholder="201012345678" />
          </div>

          <div className="actions">
            <button onClick={handleSave} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
            <button className="btn-secondary" onClick={closeForm}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="clients-list">
        {clients.map((client) => {
          const cr = checkResults[client.id];
          return (
            <div key={client.id} className="client-card">
              <div className="client-card-header">
                <div>
                  <strong>{client.clientName}</strong>{' '}
                  <span className={client.isActive ? 'status-ok' : 'status-alert'}>{client.isActive ? 'نشط' : 'متوقف'}</span>
                </div>
                <div className="client-card-actions">
                  <button onClick={() => handleCheckNow(client)} disabled={cr?.loading}>{cr?.loading ? 'جاري التشيك...' : 'تشيك دلوقتي'}</button>
                  <button className="btn-secondary" onClick={() => openEditForm(client)}>تعديل</button>
                  <button className="btn-danger" onClick={() => handleDelete(client)}>حذف</button>
                </div>
              </div>
              <p className="client-meta">
                {client.dbServer}:{client.dbPort} / {client.dbName} — واتساب: {client.whatsappPhone}
              </p>
              {cr?.error && <p className="error-text">خطأ في التشيك: {cr.error}</p>}
              {cr?.result && (
                <p className={cr.result.belowThresholdCount > 0 ? 'status-alert' : 'status-ok'}>
                  {cr.result.belowThresholdCount > 0
                    ? `⚠️ ${cr.result.belowThresholdCount} حالة تحت حد إعادة الطلب - ${cr.result.whatsapp?.sent ? 'اتبعتت رسالة واتساب ✅' : `فشل إرسال الواتساب: ${cr.result.whatsapp?.error || ''}`}`
                    : '✅ كل الأصناف فوق حد إعادة الطلب'}
                </p>
              )}
            </div>
          );
        })}
        {!loading && clients.length === 0 && <p className="hint">مفيش عملاء مضافين لسه.</p>}
      </div>
    </div>
  );
}
