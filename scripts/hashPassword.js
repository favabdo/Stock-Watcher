// بيستخدم لتوليد باسورد هاش (bcrypt) عشان تضيف أول أدمن يدويًا في الداتا بيز.
// الاستخدام:
//   node scripts/hashPassword.js "الباسورد اللي عايزه"
//
// هيطبعلك الهاش + جملة INSERT جاهزة تنفذها مرة واحدة على قاعدة البيانات
// (بعد ما migrations/004_create_admin_users_bya.sql يشتغل وينشئ الجدول).
// بعد كده تقدر تسجل دخول بالأدمن ده على /admin وتضيف أدمنز جداد من جوه
// لوحة التحكم نفسها، من غير ما تحتاج السكريبت ده تاني.

const { hashPassword } = require('../utils/password');

const plain = process.argv[2];

if (!plain) {
  console.error('استخدم: node scripts/hashPassword.js "الباسورد"');
  process.exit(1);
}

hashPassword(plain).then((hash) => {
  console.log('\nالباسورد هاش:\n');
  console.log(hash);
  console.log('\nجملة INSERT جاهزة (غيّر اسم اليوزر لو حابب، والهاش خلّيه زي ما هو):\n');
  console.log(`INSERT INTO dbo.stockwatcheradmin_byA (Username, PasswordHash) VALUES (N'admin', N'${hash}');\n`);
});
