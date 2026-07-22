const sql = require('mssql');

// كاش لاتصالات (pools) قواعد بيانات العملاء - عشان منفتحش اتصال جديد كل مرة
const poolCache = new Map(); // clientId -> Promise<ConnectionPool>

async function getPoolForClient(clientConnectionConfig) {
  const cacheKey = clientConnectionConfig.id;
  if (poolCache.has(cacheKey)) {
    return poolCache.get(cacheKey);
  }

  const config = {
    server: clientConnectionConfig.dbServer,
    database: clientConnectionConfig.dbName,
    user: clientConnectionConfig.dbUser,
    password: clientConnectionConfig.dbPassword,
    port: Number(clientConnectionConfig.dbPort) || 1433,
    options: {
      encrypt: !!clientConnectionConfig.dbEncrypt,
      trustServerCertificate: clientConnectionConfig.dbTrustServerCertificate !== false,
    },
    // max اتزود من 5 لـ 10 عشان يقدر يستحمل زيادة الـ concurrency بتاع الفحص
    // الشامل (CHECK_CONCURRENCY في multiClientCheckService) من غير ما نعمل
    // queueing على نداءات المستخدم العادية (بحث، فتح صنف...) وهي شغالة.
    // قابل للتعديل عن طريق CLIENT_POOL_MAX لو السيرفر بتاع العميل مش مستحمل.
    pool: { max: Number(process.env.CLIENT_POOL_MAX) || 10, min: 0, idleTimeoutMillis: 30000 },
  };

  const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      console.log(`[ClientPool] اتصل بنجاح بقاعدة بيانات العميل: ${clientConnectionConfig.clientName}`);
      return pool;
    })
    .catch((err) => {
      poolCache.delete(cacheKey);
      console.error(
        `[ClientPool] فشل الاتصال بقاعدة بيانات العميل "${clientConnectionConfig.clientName}":`,
        err.message
      );
      throw err;
    });

  poolCache.set(cacheKey, poolPromise);
  return poolPromise;
}

// يقفل الاتصال المخزن ويشيله من الكاش - يستخدم لما بيانات الاتصال بتتغير أو العميل بيتمسح
async function evictPool(clientId) {
  const poolPromise = poolCache.get(clientId);
  poolCache.delete(clientId);
  if (poolPromise) {
    try {
      const pool = await poolPromise;
      await pool.close();
    } catch (err) {
      // متجاهلينها - الهدف بس تنظيف الكاش
    }
  }
}

module.exports = { getPoolForClient, evictPool };
