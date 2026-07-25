const { sql, getPool } = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');
const { hashPassword } = require('../utils/password');
const clientPhonesRepository = require('./clientPhonesRepository');

// أرقام واتساب العميل بقت في جدول منفصل (StockWatcherClientPhones_byA)
// مربوط بـ ClientId، مش عمود ثابت الطول في نفس جدول العميل زي قبل كده - كده
// أي عدد أرقام تتضاف لعميل واحد ما بيعملش أي مشكلة في الطول.
function mapRow(row, phones = []) {
  return {
    id: row.Id,
    clientName: row.ClientName,
    dbServer: row.DbServer,
    dbName: row.DbName,
    dbUser: row.DbUser,
    dbPort: row.DbPort,
    dbEncrypt: !!row.DbEncrypt,
    dbTrustServerCertificate: !!row.DbTrustServerCertificate,
    whatsappPhones: phones.map((p) => ({ phone: p.phone, enabled: p.enabled })),
    loginUsername: row.LoginUsername || '',
    role: row.Role ?? 0,
    isActive: !!row.IsActive,
    createdByAdminId: row.CreatedByAdminId ?? null,
    createdByAdminUsername: row.CreatedByAdminUsername || null,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

// بيرجع كل العملاء من غير الباسورد (للعرض في صفحة الإعدادات)، مع اسم الأدمن
// اللي أضاف كل عميل (LEFT JOIN عشان العملاء القدام من غير أدمن محدد يفضلوا ظاهرين)
// وأرقام واتساب كل عميل (نداء واحد إضافي بس لكل العملاء مع بعض، مش عميل عميل).
async function getAllClients() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT c.Id, c.ClientName, c.DbServer, c.DbName, c.DbUser, c.DbPort, c.DbEncrypt,
           c.DbTrustServerCertificate, c.LoginUsername, c.Role, c.IsActive,
           c.CreatedByAdminId, a.Username AS CreatedByAdminUsername, c.CreatedAt, c.UpdatedAt
    FROM dbo.StockWatcherUsers_byA c
    LEFT JOIN dbo.stockwatcheradmin_byA a ON a.Id = c.CreatedByAdminId
    ORDER BY c.Id
  `);
  const rows = result.recordset;
  const phonesByClient = await clientPhonesRepository.getPhonesForClients(rows.map((r) => r.Id));
  return rows.map((row) => mapRow(row, phonesByClient.get(row.Id) || []));
}

async function getActiveClients() {
  const all = await getAllClients();
  return all.filter((c) => c.isActive);
}

async function getClientById(id) {
  const all = await getAllClients();
  return all.find((c) => c.id === Number(id)) || null;
}

// بيدور على عميل بيوزر تسجيل الدخول بتاعه - يستخدم وقت اللوجين بس
// (بيرجع الباسورد هاش عشان authController يقارن بيه، مبيتبعتش للفرونت إند)
async function getClientLoginByUsername(username) {
  const pool = await getPool();
  const request = pool.request();
  request.input('username', sql.NVarChar(100), username);
  const result = await request.query(`
    SELECT Id, ClientName, LoginUsername, LoginPasswordHash, Role, IsActive
    FROM dbo.StockWatcherUsers_byA
    WHERE LoginUsername = @username
  `);
  const row = result.recordset[0];
  if (!row) return null;
  return {
    id: row.Id,
    clientName: row.ClientName,
    loginUsername: row.LoginUsername,
    loginPasswordHash: row.LoginPasswordHash,
    role: row.Role ?? 0,
    isActive: !!row.IsActive,
  };
}

// بيرجع بيانات العميل كاملة شاملة الباسورد بعد فك التشفير - يستخدم داخليًا بس
// عشان نقدر نتصل بقاعدة بيانات العميل، مبيتبعتش للفرونت إند أبدًا
async function getClientConnectionConfig(id) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.Int, id);
  const result = await request.query(`
    SELECT Id, ClientName, DbServer, DbName, DbUser, DbPasswordEncrypted, DbPort,
           DbEncrypt, DbTrustServerCertificate, IsActive
    FROM dbo.StockWatcherUsers_byA
    WHERE Id = @id
  `);
  const row = result.recordset[0];
  if (!row) return null;
  const phones = await clientPhonesRepository.getPhonesForClient(row.Id);
  return {
    id: row.Id,
    clientName: row.ClientName,
    dbServer: row.DbServer,
    dbName: row.DbName,
    dbUser: row.DbUser,
    dbPassword: decrypt(row.DbPasswordEncrypted),
    dbPort: row.DbPort,
    dbEncrypt: !!row.DbEncrypt,
    dbTrustServerCertificate: !!row.DbTrustServerCertificate,
    whatsappPhones: phones.map((p) => ({ phone: p.phone, enabled: p.enabled })),
    isActive: !!row.IsActive,
  };
}

async function createClient(data, createdByAdminId) {
  const pool = await getPool();
  const request = pool.request();
  request.input('clientName', sql.NVarChar(200), data.clientName);
  request.input('dbServer', sql.NVarChar(200), data.dbServer);
  request.input('dbName', sql.NVarChar(200), data.dbName);
  request.input('dbUser', sql.NVarChar(200), data.dbUser);
  request.input('dbPasswordEncrypted', sql.NVarChar(500), encrypt(data.dbPassword));
  request.input('dbPort', sql.Int, data.dbPort || 1433);
  request.input('dbEncrypt', sql.Bit, !!data.dbEncrypt);
  request.input('dbTrustServerCertificate', sql.Bit, data.dbTrustServerCertificate !== false);
  request.input('loginUsername', sql.NVarChar(100), data.loginUsername);
  request.input('loginPasswordHash', sql.NVarChar(255), await hashPassword(data.loginPassword));
  request.input('role', sql.TinyInt, Number(data.role) || 0);
  request.input('isActive', sql.Bit, data.isActive !== false);
  request.input('createdByAdminId', sql.Int, createdByAdminId ?? null);

  const result = await request.query(`
    INSERT INTO dbo.StockWatcherUsers_byA
      (ClientName, DbServer, DbName, DbUser, DbPasswordEncrypted, DbPort,
       DbEncrypt, DbTrustServerCertificate, LoginUsername, LoginPasswordHash, Role, IsActive, CreatedByAdminId)
    OUTPUT INSERTED.Id
    VALUES
      (@clientName, @dbServer, @dbName, @dbUser, @dbPasswordEncrypted, @dbPort,
       @dbEncrypt, @dbTrustServerCertificate, @loginUsername, @loginPasswordHash, @role, @isActive, @createdByAdminId)
  `);
  const newId = result.recordset[0].Id;
  // الأرقام دلوقتي بتتخزن كصفوف مستقلة في جدول منفصل مربوط بـ ClientId، مش
  // في عمود ثابت الطول - فمهما كان عدد الأرقام مفيش أي مشكلة.
  await clientPhonesRepository.replacePhonesForClient(newId, data.whatsappPhones);
  return getClientById(newId);
}

async function updateClient(id, data) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.Int, id);
  request.input('clientName', sql.NVarChar(200), data.clientName);
  request.input('dbServer', sql.NVarChar(200), data.dbServer);
  request.input('dbName', sql.NVarChar(200), data.dbName);
  request.input('dbUser', sql.NVarChar(200), data.dbUser);
  request.input('dbPort', sql.Int, data.dbPort || 1433);
  request.input('dbEncrypt', sql.Bit, !!data.dbEncrypt);
  request.input('dbTrustServerCertificate', sql.Bit, data.dbTrustServerCertificate !== false);
  request.input('loginUsername', sql.NVarChar(100), data.loginUsername);
  request.input('role', sql.TinyInt, Number(data.role) || 0);
  request.input('isActive', sql.Bit, data.isActive !== false);

  // الباسورد يتحدث بس لو المستخدم كتب باسورد جديد (سايبه فاضي = يفضل زي ما هو)
  let passwordSetClause = '';
  if (data.dbPassword) {
    request.input('dbPasswordEncrypted', sql.NVarChar(500), encrypt(data.dbPassword));
    passwordSetClause = ', DbPasswordEncrypted = @dbPasswordEncrypted';
  }

  // باسورد تسجيل دخول العميل كمان بيتحدث بس لو الأدمن كتب باسورد جديد
  let loginPasswordSetClause = '';
  if (data.loginPassword) {
    request.input('loginPasswordHash', sql.NVarChar(255), await hashPassword(data.loginPassword));
    loginPasswordSetClause = ', LoginPasswordHash = @loginPasswordHash';
  }

  await request.query(`
    UPDATE dbo.StockWatcherUsers_byA
    SET ClientName = @clientName,
        DbServer = @dbServer,
        DbName = @dbName,
        DbUser = @dbUser,
        DbPort = @dbPort,
        DbEncrypt = @dbEncrypt,
        DbTrustServerCertificate = @dbTrustServerCertificate,
        LoginUsername = @loginUsername,
        Role = @role,
        IsActive = @isActive,
        UpdatedAt = GETDATE()
        ${passwordSetClause}
        ${loginPasswordSetClause}
    WHERE Id = @id
  `);
  // بيستبدل كل أرقام العميل ده بالمجموعة الجديدة اللي جاية من الفورم (إضافة/
  // حذف/تعطيل رقم بيتبعت كمجموعة كاملة من الفرونت إند في كل حفظ).
  await clientPhonesRepository.replacePhonesForClient(id, data.whatsappPhones);
  return getClientById(id);
}

async function deleteClient(id) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.Int, id);
  await request.query(`DELETE FROM dbo.StockWatcherUsers_byA WHERE Id = @id`);
}

module.exports = {
  getAllClients,
  getActiveClients,
  getClientById,
  getClientLoginByUsername,
  getClientConnectionConfig,
  createClient,
  updateClient,
  deleteClient,
};
