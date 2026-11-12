// Rate limiter بسيط داخل العملية (بدون اعتماديات). كافي لنسخة واحدة على
// Render/VPS واحدة؛ لو زاد عدد الـ instances لاحقًا يتحول لـ Redis.
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, keyFn = null } = {}) {
  const buckets = new Map();

  function prune(now) {
    if (buckets.size < 5000) return;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return function rateLimiter(req, res, next) {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    prune(now);

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'محاولات كثيرة في وقت قصير. جرّب بعد شوية.',
        code: 'RATE_LIMITED',
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
