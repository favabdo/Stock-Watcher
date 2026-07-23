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
  loginUsername: '',
  loginPassword: '',
  role: 0,
  isActive: true,
};

export default function ClientsSettings() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null); // null = مفيش فورم مفتوح، 'new' = إضافة عميل جديد
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [checkResults, setCheckResults] = useState({}); // clientId -> result

  async function loadClients() {
    setLoading(true);
    setError('');
    try {
      const data = await listClients();
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  function openNewForm() {
    setForm(emptyForm);
    setEditingId('new');
  }

  function openEditForm(client) {
    setForm({ ...client, dbPassword: '', loginPassword: '' }); // الباسوردات بتفضل فاضية، تتحدث بس لو كتب باسورد جديد
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
        await createClient(form);
      } else {
        await updateClient(editingId, form);
      }
      closeForm();
      await loadClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client) {
    if (!confirm(`هل أنت متأكد من حذف العميل "${client.clientName}"؟`)) return;
    try {
      await deleteClient(client.id);
      await loadClients();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCheckNow(client) {
    setCheckResults((prev) => ({ ...prev, [client.id]: { loading: true } }));
    try {
      const result = await checkClientNow(client.id);
      setCheckResults((prev) => ({ ...prev, [client.id]: { loading: false, result } }));
    } catch (err) {
      setCheckResults((prev) => ({ ...prev, [client.id]: { loading: false, error: err.message } }));
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>إعدادات العملاء</h2>
        <div>
          <button onClick={openNewForm}>+ إضافة عميل جديد</button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="hint">جارٍ التحميل...</p>}

      {editingId && (
        <div className="client-form">
          <h3>{editingId === 'new' ? 'عميل جديد' : 'تعديل بيانات العميل'}</h3>

          <div className="field">
            <label>اسم العميل</label>
            <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="مثال: نايل ستوك" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>عنوان خادم قاعدة البيانات</label>
              <input value={form.dbServer} onChange={(e) => setForm({ ...form, dbServer: e.target.value })} placeholder="مثال: 192.168.1.10" />
            </div>
            <div className="field">
              <label>المنفذ (Port)</label>
              <input type="number" value={form.dbPort} onChange={(e) => setForm({ ...form, dbPort: Number(e.target.value) })} />
            </div>
          </div>

          <div className="field">
            <label>اسم قاعدة البيانات</label>
            <input value={form.dbName} onChange={(e) => setForm({ ...form, dbName: e.target.value })} placeholder="اسم قاعدة البيانات المطلوب الاتصال بها" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>اسم مستخدم قاعدة البيانات</label>
              <input value={form.dbUser} onChange={(e) => setForm({ ...form, dbUser: e.target.value })} />
            </div>
            <div className="field">
              <label>كلمة مرور قاعدة البيانات {editingId !== 'new' && '(اتركه فارغًا للإبقاء على القيمة الحالية)'}</label>
              <input type="password" value={form.dbPassword} onChange={(e) => setForm({ ...form, dbPassword: e.target.value })} />
            </div>
          </div>

          <div className="field-row checkboxes">
            <label><input type="checkbox" checked={form.dbEncrypt} onChange={(e) => setForm({ ...form, dbEncrypt: e.target.checked })} /> تشفير الاتصال (Encrypt)</label>
            <label><input type="checkbox" checked={form.dbTrustServerCertificate} onChange={(e) => setForm({ ...form, dbTrustServerCertificate: e.target.checked })} /> الوثوق بشهادة الخادم</label>
            <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> نشط</label>
          </div>

          <div className="field-row">
            <div className="field">
              <label>اسم مستخدم دخول العميل</label>
              <input value={form.loginUsername} onChange={(e) => setForm({ ...form, loginUsername: e.target.value })} placeholder="مثال: nilestock" />
            </div>
            <div className="field">
              <label>كلمة مرور دخول العميل {editingId !== 'new' && '(اتركه فارغًا للإبقاء على القيمة الحالية)'}</label>
              <input type="password" value={form.loginPassword} onChange={(e) => setForm({ ...form, loginPassword: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label>رقم واتساب العميل (بالصيغة الدولية، مثال 201012345678)</label>
            <input value={form.whatsappPhone} onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })} placeholder="201012345678" />
          </div>

          <div className="actions">
            <button onClick={handleSave} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
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
                <div className="client-card-title">
                  <strong>{client.clientName}</strong>
                  <span className={`badge ${client.isActive ? 'badge-success' : 'badge-danger'}`}>
                    <span className={`status-dot ${client.isActive ? 'dot-success' : 'dot-danger'}`} aria-hidden="true" />
                    {client.isActive ? 'نشط' : 'متوقف'}
                  </span>
                </div>
                <div className="client-card-actions">
                  <button onClick={() => handleCheckNow(client)} disabled={cr?.loading}>
                    {cr?.loading ? 'جارٍ التحقق...' : 'تحقق الآن'}
                  </button>
                  <button className="btn-secondary" onClick={() => openEditForm(client)}>تعديل</button>
                  <button className="btn-danger" onClick={() => handleDelete(client)}>حذف</button>
                </div>
              </div>
              <p className="client-meta">
                {client.dbServer}:{client.dbPort} / {client.dbName} — واتساب: {client.whatsappPhone}
              </p>
              <p className="client-meta">
                اسم مستخدم الدخول: {client.loginUsername || <span className="error-text">غير محدد — لن يتمكن العميل من تسجيل الدخول</span>}
              </p>
              <p className="client-meta">
                أضافه: {client.createdByAdminUsername || <span className="error-text">غير معروف</span>}
              </p>
              {cr?.error && <p className="error-text">خطأ أثناء التحقق: {cr.error}</p>}
              {cr?.result && (
                <p className={`client-check-result ${cr.result.belowThresholdCount > 0 ? 'status-alert' : 'status-ok'}`}>
                  {cr.result.belowThresholdCount > 0
                    ? `⚠️ ${cr.result.belowThresholdCount} حالة بلغت حد إعادة الطلب — ${cr.result.whatsapp?.sent ? 'تم إرسال رسالة واتساب ✅' : `تعذّر إرسال واتساب: ${cr.result.whatsapp?.error || ''}`}`
                    : '✅ جميع الأصناف فوق حد إعادة الطلب'}
                </p>
              )}
            </div>
          );
        })}
        {!loading && clients.length === 0 && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="7" width="17" height="12" rx="2" />
              <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
            </svg>
            <p className="empty-state-title">لا يوجد عملاء مضافون بعد</p>
            <p className="empty-state-desc">ابدأ بإضافة أول عميل لمتابعة مخزونه.</p>
          </div>
        )}
      </div>
    </div>
  );
}
