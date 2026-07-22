const { sql } = require('../config/db');

// بحث عن صنف بالكود أو الاسم (عربي/إنجليزي)
// لو المستخدم كتب رقم كود بالظبط -> مطابقة تامة على الكود (يرجع الصنف ده بس)
// لو كتب نص -> بحث جزئي في الاسم (عربي/إنجليزي) زي ما كان
async function searchItems(pool, term) {
  const request = pool.request();

  const isExactCode = /^\d+$/.test(term.trim());

  if (isExactCode) {
    request.input('term', sql.NVarChar(200), term.trim());
    const result = await request.query(`
      SELECT TOP 50
        ID, Code, Name_Ar, Name_En, ReorderQty, MinQty, MaxQty
      FROM dbo.wh_Items
      WHERE Code = @term
      ORDER BY Code
    `);
    return result.recordset;
  }

  request.input('term', sql.NVarChar(200), `%${term}%`);
  const result = await request.query(`
    SELECT TOP 50
      ID, Code, Name_Ar, Name_En, ReorderQty, MinQty, MaxQty
    FROM dbo.wh_Items
    WHERE Name_Ar LIKE @term OR Name_En LIKE @term
    ORDER BY Code
  `);
  return result.recordset;
}

async function getItemById(pool, id) {
  const request = pool.request();
  request.input('id', sql.Int, id);
  const result = await request.query(`
    SELECT ID, Code, Name_Ar, Name_En, ReorderQty, MinQty, MaxQty
    FROM dbo.wh_Items
    WHERE ID = @id
  `);
  return result.recordset[0] || null;
}

async function updateReorderQty(pool, id, reorderQty) {
  const request = pool.request();
  request.input('id', sql.Int, id);
  request.input('reorderQty', sql.Float, reorderQty);
  await request.query(`
    UPDATE dbo.wh_Items
    SET ReorderQty = @reorderQty
    WHERE ID = @id
  `);
  return getItemById(pool, id);
}

// كل الأصناف اللي ليها حد إعادة طلب متظبط (ReorderQty <> 0) - يستخدم في الفحص
// الشامل التلقائي لكل الأصناف بتاع كل عميل (مش صنف واحد بس زي الفحص اليدوي)
async function getAllItemsWithReorder(pool) {
  const result = await pool.request().query(`
    SELECT ID, Code, Name_Ar, Name_En, ReorderQty, MinQty, MaxQty
    FROM dbo.wh_Items
    WHERE ReorderQty IS NOT NULL AND ReorderQty <> 0
    ORDER BY Code
  `);
  return result.recordset;
}

module.exports = { searchItems, getItemById, updateReorderQty, getAllItemsWithReorder };
