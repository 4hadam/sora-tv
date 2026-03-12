# Sora TV — تشغيل المشروع محليًا

ملخص سريع لإعداد وتشغيل المشروع محليًا.

متطلبات
- Node.js >= 20
- npm

التثبيت
```bash
npm install
```

تشغيل وضع التطوير
- يشغّل الخادم وVite (الواجهة) معًا عبر `server/index.ts`:
```powershell
# اختياري: تغيير المنفذ
$env:PORT="5001"
npm run dev
```

بناء للإنتاج
```bash
npm run build
# ثم تشغيل النسخة المبنية (بعد إعداد ملفات الاستضافة)
npm start
```

متغيرات بيئة مهمة
انشئ ملف `.env` محليًا أو استخدم `.env.example` كمرجع. المتغيرات المستخدمة في المشروع:

- `NODE_ENV` — `development` | `production`
- `PORT` — رقم المنفذ (مثلاً `5000` أو `5001`)
- `DATABASE_URL` أو `PG_CONN_STRING` — سلسلة اتصال PostgreSQL (اختياري)
- `API_KEY` — مفتاح اختياري لحماية بعض API (اختياري)
- `ALLOWED_HOSTS` — قائمة مضيفين مفصولة بفواصل لصلاحية البروكسي (اختياري)
- `CORS_ORIGIN` — قيمة رأس Access-Control-Allow-Origin (افتراضي `*`)
- `RATE_LIMIT_WINDOW_MS` — مدة نافذة تحديد المعدل بالملي ثانية
- `RATE_LIMIT_MAX` — الحد الأقصى للطلبات داخل النافذة
- `AUTO_PUSH` — (script) `true` أو `false` لتشغيل ميزات نشر تلقائي

قاعدة البيانات
- توجد ملفات migrations في `migrations/`.
- المشروع يدعم Drizzle ORM؛ لتشغيل على Postgres، عيّن `DATABASE_URL` ثم شغّل:
```bash
db:push  # عبر script المحلي (تأكد من تثبيت drizzle-kit)
```

مشكلات شائعة
- إذا ظهر خطأ `EADDRINUSE` يعني أن المنفذ محجوز؛ غيّر `PORT` أو أنهِ العملية التي تستخدم المنفذ.
- عند ظهور شاشة سوداء: افتح DevTools (F12) وتحقق من `Console` و`Network`، تحقق من `/src/main.tsx` و`/@vite/client`.

أدوات مفيدة في المشروع
- سكربتات إدارة القنوات: `script/update-iptv-channels.ts`, `script/cleanup-channels.ts` وغيرها في مجلد `script/`.
- الخادم يقدم proxy وrewrites عبر `/api/proxy` و`/api/stream`.

خطوات مقترحة لاحقًا
1. إضافة `.env.example` (موجود هنا).
2. إعداد CI (GitHub Actions) للفحص والبناء.
3. إضافة ESLint/Prettier و`vitest` للاختبارات.
4. إضافة `Dockerfile` و`docker-compose.yml` إن أردت بيئة متسقة للنشر.

-- انتهى --
