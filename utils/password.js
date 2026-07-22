const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// بيهش الباسورد قبل ما يتخزن في LoginPasswordHash - مبنخزنش أي باسورد نص صريح
async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), SALT_ROUNDS);
}

// بيقارن الباسورد اللي العميل كتبه وقت تسجيل الدخول بالهاش المخزن
async function comparePassword(plainPassword, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(plainPassword), hash);
}

module.exports = { hashPassword, comparePassword };
