const { sql, getPool } = require('../config/db');
const { hashPassword } = require('../utils/password');

function mapRow(row) {
  return {
    id: row.Id,
    username: row.Username,
    createdAt: row.CreatedAt,
  };
}

// بيرجع كل الأدمنز من غير الباسورد (يستخدم في صفحة "حسابات الأدمن")
async function getAllAdmins() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT Id, Username, CreatedAt
    FROM dbo.stockwatcheradmin_byA
    ORDER BY Id
  `);
  return result.recordset.map(mapRow);
}

// بيدور على أدمن بيوزره - يستخدم وقت اللوجين بس (بيرجع الباسورد هاش عشان
// authController يقارن بيه، مبيتبعتش للفرونت إند)
async function getAdminByUsername(username) {
  const pool = await getPool();
  const request = pool.request();
  request.input('username', sql.NVarChar(100), username);
  const result = await request.query(`
    SELECT Id, Username, PasswordHash
    FROM dbo.stockwatcheradmin_byA
    WHERE Username = @username
  `);
  const row = result.recordset[0];
  if (!row) return null;
  return { id: row.Id, username: row.Username, passwordHash: row.PasswordHash };
}

async function createAdmin(username, plainPassword) {
  const pool = await getPool();
  const request = pool.request();
  request.input('username', sql.NVarChar(100), username);
  request.input('passwordHash', sql.NVarChar(255), await hashPassword(plainPassword));
  const result = await request.query(`
    INSERT INTO dbo.stockwatcheradmin_byA (Username, PasswordHash)
    OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.CreatedAt
    VALUES (@username, @passwordHash)
  `);
  return mapRow(result.recordset[0]);
}

module.exports = { getAllAdmins, getAdminByUsername, createAdmin };
