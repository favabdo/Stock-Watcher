const clientsRepository = require('../repositories/clientsRepository');
const clientPoolManager = require('../services/clientPoolManager');
const multiClientCheckService = require('../services/multiClientCheckService');
const creditLimitCheckService = require('../services/creditLimitCheckService');

async function list(req, res, next) {
  try {
    const clients = await clientsRepository.getAllClients();
    res.json(clients);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { clientName, dbServer, dbName, dbUser, dbPassword, whatsappPhones, loginUsername, loginPassword } = req.body;
    const hasAtLeastOnePhone = Array.isArray(whatsappPhones) && whatsappPhones.some((p) => String(p?.phone || '').trim());
    if (!clientName || !dbServer || !dbName || !dbUser || !dbPassword || !hasAtLeastOnePhone) {
      return res.status(400).json({
        error: 'لازم تملى: اسم العميل، السيرفر، اسم قاعدة البيانات، اليوزر، الباسورد، ورقم واتساب واحد على الأقل',
      });
    }
    if (!loginUsername || !loginPassword) {
      return res.status(400).json({
        error: 'لازم تحدد يوزر وباسورد تسجيل دخول للعميل عشان يقدر يشوف بياناته',
      });
    }
    // لازم يتفعل نوع تنبيه واحد على الأقل (حد إعادة الطلب و/أو الحد الائتماني)
    if (req.body.alertStockEnabled === false && !req.body.alertCreditLimitEnabled) {
      return res.status(400).json({
        error: 'لازم تفعّل نوع تنبيه واحد على الأقل: حد إعادة الطلب أو الحد الائتماني',
      });
    }
    const client = await clientsRepository.createClient(req.body, req.admin?.id ?? null);
    res.status(201).json(client);
  } catch (err) {
    if (err.number === 2601 || err.number === 2627) {
      return res.status(409).json({ error: 'يوزر الدخول ده مستخدم بالفعل لعميل تاني، اختار يوزر مختلف' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (req.body.alertStockEnabled === false && !req.body.alertCreditLimitEnabled) {
      return res.status(400).json({
        error: 'لازم تفعّل نوع تنبيه واحد على الأقل: حد إعادة الطلب أو الحد الائتماني',
      });
    }
    await clientPoolManager.evictPool(id); // لو بيانات الاتصال اتغيرت، نقفل الاتصال القديم المخزن
    const client = await clientsRepository.updateClient(id, req.body);
    if (!client) return res.status(404).json({ error: 'العميل غير موجود' });
    res.json(client);
  } catch (err) {
    if (err.number === 2601 || err.number === 2627) {
      return res.status(409).json({ error: 'يوزر الدخول ده مستخدم بالفعل لعميل تاني، اختار يوزر مختلف' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    await clientPoolManager.evictPool(id);
    await clientsRepository.deleteClient(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// فحص فوري يدوي لعميل معين + بعت واتساب لو لقى حاجة تحت الحد - بيشغل فحص
// الاستوك و/أو فحص الحد الائتماني على حسب نوع التنبيهات المفعّلة لهذا العميل
// (alertStockEnabled / alertCreditLimitEnabled).
async function checkNow(req, res, next) {
  try {
    const id = Number(req.params.id);
    const fullConfig = await clientsRepository.getClientConnectionConfig(id);
    if (!fullConfig) return res.status(404).json({ error: 'العميل غير موجود' });

    const [stock, credit] = await Promise.all([
      fullConfig.alertStockEnabled ? multiClientCheckService.runCheckForClient(fullConfig) : null,
      fullConfig.alertCreditLimitEnabled ? creditLimitCheckService.runCreditCheckForClient(fullConfig) : null,
    ]);

    res.json({
      clientId: fullConfig.id,
      clientName: fullConfig.clientName,
      stock,
      credit,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, checkNow };
