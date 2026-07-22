const clientsRepository = require('../repositories/clientsRepository');
const clientPoolManager = require('../services/clientPoolManager');
const multiClientCheckService = require('../services/multiClientCheckService');

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
    const { clientName, dbServer, dbName, dbUser, dbPassword, whatsappPhone } = req.body;
    if (!clientName || !dbServer || !dbName || !dbUser || !dbPassword || !whatsappPhone) {
      return res.status(400).json({
        error: 'لازم تملى: اسم العميل، السيرفر، اسم قاعدة البيانات، اليوزر، الباسورد، ورقم الواتساب',
      });
    }
    const client = await clientsRepository.createClient(req.body);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    await clientPoolManager.evictPool(id); // لو بيانات الاتصال اتغيرت، نقفل الاتصال القديم المخزن
    const client = await clientsRepository.updateClient(id, req.body);
    if (!client) return res.status(404).json({ error: 'العميل غير موجود' });
    res.json(client);
  } catch (err) {
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

// فحص فوري يدوي لعميل معين + بعت واتساب لو لقى حاجة تحت الحد
async function checkNow(req, res, next) {
  try {
    const id = Number(req.params.id);
    const fullConfig = await clientsRepository.getClientConnectionConfig(id);
    if (!fullConfig) return res.status(404).json({ error: 'العميل غير موجود' });
    const result = await multiClientCheckService.runCheckForClient(fullConfig);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, checkNow };
