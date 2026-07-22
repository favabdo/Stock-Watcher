// البروسيدر wh_FollowRequestEnd بيطلب BranchID بالظبط (مفيش خيار "كل الفروع" جواه)
// فبنجيب كل الفروع الموجودة فعليًا في الحركات، ونلف عليها واحد واحد.
// `pool` بياخد اتصال قاعدة بيانات (الافتراضية أو قاعدة بيانات عميل معين في النظام متعدد العملاء)
async function getAllBranchIds(pool) {
  const result = await pool.request().query(`
    SELECT DISTINCT BranchID
    FROM dbo.wh_TransHeader
    WHERE BranchID IS NOT NULL
    ORDER BY BranchID
  `);
  return result.recordset.map((r) => r.BranchID);
}

module.exports = { getAllBranchIds };
