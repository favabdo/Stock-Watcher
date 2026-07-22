# Stock Watcher

صفحة ويب لإدارة حد إعادة الطلب (`ReorderQty`) في جدول `wh_Items`، مع تشيك مباشر على الاستوك عبر البروسيدر `wh_FollowRequestEnd` في كل الفروع.

اللوجو والأيقونات (تبويب المتصفح + تثبيت على الموبايل) جاهزين ومظبوطين، تفاصيلهم في قسم "اللوجو والأيقونات" تحت.

## الستاك

- **الباك اند**: Node.js/Express + `mssql` (tedious) — نفس بنية NileChat.
- **الفرونت اند**: React (Vite) في مجلد `client/`، وبتتبني مباشرة جوه مجلد `public/` عشان Express يسيرفها كملفات static عادية (مفيش سيرفر تاني منفصل في الإنتاج).

## تعدد العملاء وتسجيل دخول العميل (Multi-tenant)

الأدمن بيضيف كل عميل من صفحة "الإعدادات" (محمية بـ Basic Auth عبر `SETTINGS_BASIC_AUTH_USER`/`PASS`)، وبيدخل له بيانات نوعين مختلفين تمامًا:

1. **بيانات الاتصال بقاعدة بيانات العميل** (`DbServer`/`DbName`/`DbUser`/`DbPassword`...) - دي السيرفر بيستخدمها داخليًا بس عشان يوصل لقاعدة بيانات العميل ويجيب منها الأصناف/الاستوك، ومبتتبعتش للعميل نفسه أبدًا.
2. **يوزر وباسورد تسجيل دخول العميل** (`LoginUsername`/`LoginPassword`) - دي اللي العميل بيدخل بيها على الموقع من الصفحة الرئيسية عشان يشوف بياناته هو بس.

الصفحة الرئيسية بقت صفحة تسجيل دخول: العميل بيكتب اليوزر والباسورد اللي الأدمن أداهوله، والسيرفر بيرجعله توكن (JWT) صالح لمدة 30 يوم بيتخزن في المتصفح، وكل الطلبات بعد كده (البحث، المخزون المنخفض، التشيك...) بتتفلتر تلقائيًا على قاعدة بيانات العميل ده بس - مش كل العملاء زي ما كان بيحصل قبل كده.

### API الخاص بتسجيل الدخول

- `POST /api/auth/login` `{ "username": "...", "password": "..." }` → `{ token, client: { id, clientName } }`
- `GET  /api/auth/me` (محتاج `Authorization: Bearer <token>`) → بيرجع بيانات العميل، يستخدم للتأكد من صلاحية الجلسة بعد إعادة تحميل الصفحة.

كل مسارات `/api/items/*` بقت محمية بنفس التوكن ده (middleware `clientAuth`)، وأي طلب من غيره بيرجع `401`.

### Environment variable جديد

- `JWT_SECRET` - مفتاح توليد جلسات الدخول، ولّده بنفس طريقة `ENCRYPTION_KEY`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

### Migration جديد

`migrations/002_add_client_login_bya.sql` بيضيف عمودين لجدول `StockWatcherUsers_byA` (`LoginUsername`, `LoginPasswordHash`) بيتشغلوا تلقائيًا مع بدء تشغيل السيرفر (`server.js`)، زي أي migration تاني في المشروع.

> ملحوظة: أي عميل قديم اتضاف قبل التحديث ده، لازم الأدمن يفتح له "تعديل" من صفحة الإعدادات ويحط له يوزر وباسورد دخول، وإلا مش هيقدر يسجل دخول.

## التشغيل (Backend)

```bash
npm install
cp .env.example .env
# عدّل بيانات الاتصال بـ SQL Server في .env
npm start
```

السيرفر هيشتغل على `http://localhost:4000` (أو الـ PORT اللي هتحدده)، وهيسيرف الواجهة من `public/` (اللي هي ناتج بناء React).

## التشغيل (Frontend - React)

الواجهة جاهزة ومبنية بالفعل جوه `public/`، يعني `npm start` في الباك اند كفاية عشان تشوفها فورًا. لو عايز تعدل في الواجهة نفسها:

```bash
cd client
npm install
npm run dev      # وضع تطوير على http://localhost:5173 (بيعمل proxy لـ /api على localhost:4000)
```

ولما تخلص تعديل، ابني نسخة جديدة تدخل مكان القديمة في `public/`:

```bash
cd client
npm run build     # بيطلع الملفات جوه ../public تلقائيًا (emptyOutDir: true)
```

بعدها شغّل الباك اند عادي (`npm start` من الجذر) وهيسيرف النسخة الجديدة.

## النشر على Render

المشروع فيه `render.yaml` جاهز (Blueprint)، وممكن كمان تعمل Web Service يدوي بالإعدادات دي:

- **Build Command**: `npm install && npm run build` (بيثبت الباك اند وكمان بيبني الفرونت اند React جوه `public/` تلقائيًا)
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Environment Variables** (لازم تضيفها من Render Dashboard، من `.env.example`):
  - `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_ENCRYPT`, `DB_TRUST_CERT`
  - `ENCRYPTION_KEY`, `JWT_SECRET`, `SETTINGS_BASIC_AUTH_USER`, `SETTINGS_BASIC_AUTH_PASS`
  - Render بيحط `PORT` تلقائيًا، السيرفر بيقرأها من `process.env.PORT` أصلاً.

### ⚠️ الحاجة الوحيدة اللي لازم تتأكد منها قبل النشر

Render سيرفر سحابي (مش على نفس شبكة السيرفر بتاعك)، فعشان الاتصال بـ SQL Server يشتغل، لازم:
1. الـ SQL Server يكون معاه **IP عام (public) أو reachable من بره الشبكة المحلية** (مش localhost/شبكة داخلية بس).
2. الـ Firewall بتاع السيرفر يسمح بالاتصال على البورت (افتراضيًا 1433) من الإنترنت (أو من IP رينج Render لو حابب تقفلها أكتر).
3. لو الـ SQL Server عنده شهادة SSL موقعة، خلي `DB_ENCRYPT=true` و`DB_TRUST_CERT=false`. لو من غير شهادة رسمية (self-signed) سيب `DB_ENCRYPT=false` أو `DB_TRUST_CERT=true` زي الإعداد الافتراضي.

لو الـ SQL Server لسه على جهاز/شبكة محلية من غير public access، Render مش هيقدر يوصله، وهتحتاج إما تعمل publish للبورت (port forwarding + dynamic DNS)، أو تستخدم SQL Server سحابي (Azure SQL مثلاً)، أو تعمل Tunnel (زي ngrok/Cloudflare Tunnel) للتجربة.

## طريقة الاستخدام

1. دور عن الصنف بالكود أو الاسم.
2. دوس على الصنف من نتائج البحث.
3. عدّل الرقم في خانة "حد إعادة الطلب" واضغط "حفظ الحد" (بيعدّل عمود `ReorderQty` في `wh_Items` مباشرة).
4. اضغط "تشيك الاستوك الآن":
   - بيجيب كل الـ `BranchID` الموجودة فعليًا في `wh_TransHeader`.
   - بيشغل `wh_FollowRequestEnd` لكل فرع لوحده (لأن البروسيدر مبني على فرع واحد بالظبط، مفيش خيار "كل الفروع" جواه).
   - لو الصنف رجع في نتيجة فرع معين، معناه إنه فعلاً تحت حد إعادة الطلب في الفرع ده (لأن البروسيدر نفسه بيفلتر `ReorderQty<>0 and stock<=ReorderQty`).
   - بيطبع سطر `[ACTION][ReorderAlert]` في تيرمينال السيرفر لكل حالة تحت الحد — ده مكان الإشعار الحقيقي (واتساب / إيميل / إشعار داخلي) اللي هتحدده بعدين.
   - وبيعرض جدول بكل الفروع وحالة كل فرع في الصفحة نفسها.

## إعدادات مهمة اتفقنا عليها

- `@TDate` بيتبعت كرقم بصيغة `YYYYMMDD` (مثلاً `20260722`) — الافتراضي هو تاريخ اليوم، وممكن تغيّره من `stockRepository.js` لو احتجت تاريخ تاريخي.
- `@StoreId` بيتبعت `0` يعني "كل المخازن" (زي ما موضح جوه البروسيدر نفسه).
- `@BranchID` بيتلف على كل الفروع الموجودة (مفيش قيمة NULL أو 0 بتعمل "الكل" جوه البروسيدر، فالحل كان اللوب).

## الملفات

```
config/db.js              - الاتصال بـ SQL Server (mssql/tedious)
repositories/              - استعلامات SQL خام (items, branches, stock)
services/stockCheckService - منطق اللوب على الفروع + الطباعة
controllers/                - Express controllers
routes/items.routes.js      - API routes
client/                     - كود الواجهة (React + Vite): src/App.jsx, src/components/*
public/                     - ناتج بناء React (dist) اللي Express بيسيرفه
```

## اللوجو والأيقونات

- اللوجو الأصلي اتشال منه الخلفية، ورمز "N" (السمبل) اتقص لوحده عشان يبان واضح في الأحجام الصغيرة.
- `client/public/icons/` فيها كل الأحجام: `favicon.ico` + `favicon-16/32/48.png` (تبويب المتصفح)، `apple-touch-icon.png` (iOS)، و`icon-192/512.png` + نسخ `maskable` (Android/PWA).
- `client/public/manifest.webmanifest` بيربط الأيقونات دي كـ PWA، فلو حد ثبّت الصفحة على الشاشة الرئيسية (Android أو iOS "Add to Home Screen")، هيظهر نفس اللوجو تمامًا زي التبويب.
- كل ده بيتنسخ تلقائيًا لـ `public/` مع أي `npm run build` جديد (مفيش حاجة إضافية تعملها).
- لو حبيت تغيّر اللوجو نفسه لاحقًا، استبدل الصور في `client/public/icons/` وكمان `client/src/logo.png` (المستخدم في هيدر الصفحة).

## API

- `POST /api/auth/login`                يسجل دخول العميل `{ "username": "...", "password": "..." }`
- `GET  /api/auth/me`                   بيانات العميل المسجل دخول حاليًا (محتاج توكن)
- `GET  /api/items/search?q=...`       بحث عن صنف (محتاج توكن، على قاعدة بيانات العميل بس)
- `GET  /api/items/:id`                بيانات صنف
- `PUT  /api/items/:id/reorder-qty`    تعديل الحد `{ "reorderQty": 10 }`
- `POST /api/items/:id/check-stock`    تشيك الاستوك في كل الفروع
