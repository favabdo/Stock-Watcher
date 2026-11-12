const crypto = require('crypto');

// Refresh token عشوائي opaque - لا يُخزَّن في قاعدة البيانات كنص صريح.
function generateRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

module.exports = { generateRefreshToken, hashRefreshToken };
