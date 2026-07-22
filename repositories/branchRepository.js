const { getPool } = require('../config/db');

// البروسيدر wh_FollowRequestEnd بيطلب BranchID بالظبط (مفيش خيار "كل الفروع" جواه)
// فبنجيب كل الفروع الموجودة فعليًا في الحركات، ونلف عليها واحد واحد.
async function getAllBranchIds() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT DISTINCT BranchID
    FROM dbo.wh_TransHeader
    WHERE BranchID IS NOT NULL
    ORDER BY BranchID
  `);
  return result.recordset.map((r) => r.BranchID);
}

module.exports = { getAllBranchIds };
