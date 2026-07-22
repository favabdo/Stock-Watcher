const { sql, getPool } = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');
const { hashPassword } = require('../utils/password');

function mapRow(row) {
  return {
    id: row.Id,
    clientName: row.ClientName,
    dbServer: row.DbServer,
    dbName: row.DbName,
    dbUser: row.DbUser,
    dbPort: row.DbPort,
    dbEncrypt: !!row.DbEncrypt,
    dbTrustServerCertificate: !!row.DbTrustServerCertificate,
    whatsappPhone: row.WhatsappPhone,
    loginUsername: row.LoginUsername || '',
    role: row.Role ?? 0,
    isActive: !!row.IsActive,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

// بيرجع كل العملاء من غير الباسورد (للعرض في صفحة الإعدادات)
async function getAllClients() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id, ClientName, DbServer, DbName, DbUser, DbPort, DbEncrypt,
           DbTrustServerCertificate, WhatsappPhone, LoginUsername, Role, IsActive, CreatedAt, UpdatedAt
    FROM dbo.StockWatcherUsers_byA
    ORDER BY Id
  `);
  return result.recordset.map(mapRow);
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
           DbEncrypt, DbTrustServerCertificate, WhatsappPhone, IsActive
    FROM dbo.StockWatcherUsers_byA
    WHERE Id = @id
  `);
  const row = result.recordset[0];
  if (!row) return null;
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
    whatsappPhone: row.WhatsappPhone,
    isActive: !!row.IsActive,
  };
}

async function createClient(data) {
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
  request.input('whatsappPhone', sql.NVarChar(30), data.whatsappPhone);
  request.input('loginUsername', sql.NVarChar(100), data.loginUsername);
  request.input('loginPasswordHash', sql.NVarChar(255), await hashPassword(data.loginPassword));
  request.input('role', sql.TinyInt, Number(data.role) || 0);
  request.input('isActive', sql.Bit, data.isActive !== false);

  const result = await request.query(`
    INSERT INTO dbo.StockWatcherUsers_byA
      (ClientName, DbServer, DbName, DbUser, DbPasswordEncrypted, DbPort,
       DbEncrypt, DbTrustServerCertificate, WhatsappPhone, LoginUsername, LoginPasswordHash, Role, IsActive)
    OUTPUT INSERTED.Id
    VALUES
      (@clientName, @dbServer, @dbName, @dbUser, @dbPasswordEncrypted, @dbPort,
       @dbEncrypt, @dbTrustServerCertificate, @whatsappPhone, @loginUsername, @loginPasswordHash, @role, @isActive)
  `);
  return getClientById(result.recordset[0].Id);
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
  request.input('whatsappPhone', sql.NVarChar(30), data.whatsappPhone);
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
        WhatsappPhone = @whatsappPhone,
        LoginUsername = @loginUsername,
        Role = @role,
        IsActive = @isActive,
        UpdatedAt = GETDATE()
        ${passwordSetClause}
        ${loginPasswordSetClause}
    WHERE Id = @id
  `);
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
