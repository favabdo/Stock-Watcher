/**
 * بينفذ array من الـ tasks بحد أقصى من التوازي (concurrency) بدل ما يشتغل
 * كل عنصر لوحده بالتسلسل وينتظر خلاصه قبل ما يبدأ اللي بعده.
 *
 * ده بيقلل وقت الانتظار جدًا لما يكون عندنا مئات/آلاف النداءات لقاعدة البيانات
 * (زي فحص كل صنف في كل فرع) لأننا بنبعت كذا نداء في نفس الوقت بدل نداء واحد
 * بس في كل لحظة.
 *
 * لازم الـ limit يكون أقل من أو يساوي أقصى عدد اتصالات في الـ connection pool
 * (pool.max في config/db.js أو clientPoolManager.js) عشان منعملش queueing
 * زيادة عن اللازم أو نرهق السيرفر.
 *
 * @param {Array} items - العناصر المطلوب تنفيذها
 * @param {number} limit - أقصى عدد tasks تشتغل في نفس الوقت
 * @param {(item: any, index: number) => Promise<any>} worker - الدالة اللي بتتنفذ لكل عنصر
 * @returns {Promise<Array>} نتايج كل العناصر (بنفس الترتيب الأصلي)
 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, runNext));

  return results;
}

module.exports = { mapWithConcurrency };
