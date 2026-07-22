const { sql, getPool } = require('../config/db');

// بحث عن صنف بالكود أو الاسم (عربي/إنجليزي)
async function searchItems(term) {
  const pool = await getPool();
  const request = pool.request();
  request.input('term', sql.NVarChar(200), `%${term}%`);
  const result = await request.query(`
    SELECT TOP 50
      ID, Code, Name_Ar, Name_En, ReorderQty, MinQty, MaxQty
    FROM dbo.wh_Items
    WHERE Code LIKE @term OR Name_Ar LIKE @term OR Name_En LIKE @term
    ORDER BY Code
  `);
  return result.recordset;
}

async function getItemById(id) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.Int, id);
  const result = await request.query(`
    SELECT ID, Code, Name_Ar, Name_En, ReorderQty, MinQty, MaxQty
    FROM dbo.wh_Items
    WHERE ID = @id
  `);
  return result.recordset[0] || null;
}

async function updateReorderQty(id, reorderQty) {
  const pool = await getPool();
  const request = pool.request();
  request.input('id', sql.Int, id);
  request.input('reorderQty', sql.Float, reorderQty);
  await request.query(`
    UPDATE dbo.wh_Items
    SET ReorderQty = @reorderQty
    WHERE ID = @id
  `);
  return getItemById(id);
}

module.exports = { searchItems, getItemById, updateReorderQty };
