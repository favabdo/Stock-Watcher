const adminRepository = require('../repositories/adminRepository');
const { comparePassword } = require('../utils/password');
const { signAdminToken } = require('../utils/adminToken');

// تسجيل دخول الأدمن الحقيقي (يوزر + باسورد من جدول stockwatcheradmin_byA)
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'لازم تكتب اليوزر والباسورد' });
    }

    const admin = await adminRepository.getAdminByUsername(username.trim());
    if (!admin) {
      return res.status(401).json({ error: 'اليوزر أو الباسورد غلط' });
    }

    const ok = await comparePassword(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'اليوزر أو الباسورد غلط' });
    }

    const token = signAdminToken(admin);
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    next(err);
  }
}

// بيرجع بيانات الأدمن المسجل دخول حاليًا (يستخدم لاسترجاع الجلسة بعد إعادة تحميل الصفحة)
async function me(req, res) {
  res.json({ admin: req.admin });
}

// بيرجع كل حسابات الأدمن الموجودة (من غير باسوردات) - لصفحة "حسابات الأدمن"
async function list(req, res, next) {
  try {
    const admins = await adminRepository.getAllAdmins();
    res.json(admins);
  } catch (err) {
    next(err);
  }
}

// إضافة أدمن جديد - محمي بـ adminAuth، يعني لازم تكون مسجل دخول كأدمن أصلاً عشان تضيف واحد جديد
async function createAdmin(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'لازم تكتب يوزر وباسورد للأدمن الجديد' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'الباسورد لازم يكون 6 حروف على الأقل' });
    }

    const existing = await adminRepository.getAdminByUsername(username.trim());
    if (existing) {
      return res.status(409).json({ error: 'اليوزر ده مستخدم بالفعل، اختار يوزر مختلف' });
    }

    const admin = await adminRepository.createAdmin(username.trim(), password);
    res.status(201).json(admin);
  } catch (err) {
    if (err.number === 2601 || err.number === 2627) {
      return res.status(409).json({ error: 'اليوزر ده مستخدم بالفعل، اختار يوزر مختلف' });
    }
    next(err);
  }
}

module.exports = { login, me, list, createAdmin };
