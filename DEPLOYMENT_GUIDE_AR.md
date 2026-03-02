# 🚀 دليل النشر و ربط الدومين مع Google Search Console

## 📋 جدول المحتويات
1. [تحضيرات أولية](#تحضيرات-أولية)
2. [اختيار مزود الـ Hosting](#اختيار-مزود-الـ-hosting)
3. [ربط الدومين](#ربط-الدومين)
4. [إضافة الموقع في Google Search Console](#إضافة-الموقع-في-google-search-console)
5. [التحقق والفهرسة](#التحقق-والفهرسة)

---

## ✅ تحضيرات أولية

قبل النشر، تأكد من:

- [x] الموقع يعمل بدون مشاكل محلياً (`npm run dev`)
- [x] لا توجد أخطاء في الـ Console
- [x] الموقع responsive على الهاتف
- [x] جميع الصور محسّنة
- [x] robots.txt صحيح
- [x] sitemap.xml موجود
- [x] Meta tags كاملة

---

## 🌍 اختيار مزود الـ Hosting

### **الخيار 1: Netlify** (الموصى به)
✅ **المميزات:**
- نشر تلقائي من GitHub
- HTTPS مجاني وتلقائي
- سرعة عالية جداً
- دعم SPA routing
- CDN عالمي

**الخطوات:**
```bash
1. اذهب إلى: https://netlify.app
2. سجل دخول ببريدك أو حسابك على GitHub
3. اختر "New site from Git"
4. اختر Repository: sora-tv
5. Branch: main
6. Build command: npm run build
7. Publish directory: dist/public
8. اضغط Deploy
```

### **الخيار 2: Vercel**
✅ **المميزات:**
- نشر سهل جداً
- Performance عالي
- HTTPS مجاني
- Analytics مدمج

**الخطوات:**
```bash
1. اذهب إلى: https://vercel.com
2. اختر "Import Project"
3. اختر GitHub repository
4. Framework Preset: Other
5. اضغط Deploy
```

### **الخيار 3: Railway / Render**
✅ **المميزات:**
- دعم كامل للـ Docker
- Backend + Frontend في مكان واحد

---

## 🔗 ربط الدومين

### **خطوة 1: اشتري دومين**

من أحد المسجلات:
- **GoDaddy** (الأعرق)
- **Namecheap** (الأرخص)
- **Domain.com**
- **google Domains**

**السعر:** من $8-15 سنوياً

### **خطوة 2: أشر الـ DNS للـ Hosting**

#### إذا كنت تستخدم Netlify:

1. في Netlify, اذهب إلى: **Domain settings**
2. اختر **Add a custom domain**
3. أدخل دومينك: `yourdomain.com`
4. Netlify سيعطيك nameservers:
   ```
   dns1.p06.nsone.net
   dns2.p06.nsone.net
   dns3.p06.nsone.net
   dns4.p06.nsone.net
   ```
5. في GoDaddy/Namecheap:
   - اذهب إلى DNS Settings
   - ابدل الـ Nameservers
   - أضف Netlify nameservers
   - انتظر 24 ساعة

#### إذا كنت تستخدم Vercel:

1. في Vercel: **Domains** → **Add**
2. أدخل دومينك
3. Vercel يعطيك:
   - A records
   - CNAME records
   - TXT records
4. أضفها في DNS Settings عند المسجل

### **خطوة 3: تفعيل HTTPS**

تلقائياً! Netlify و Vercel يفعلوها بدون تدخل.

---

## 🔍 إضافة الموقع في Google Search Console

### **الخطوة 1: إنشء الحساب**

1. اذهب إلى: https://search.google.com/search-console
2. سجل دخول ببريدك على Google
3. اختر **Add property**

### **الخطوة 2: اختر نوع الـ Property**

#### **الخيار A: Domain Property** (موصى به)
```
ادخل: yourdomain.com (بدون www و https)
```

#### **الخيار B: URL Prefix Property**
```
ادخل: https://www.yourdomain.com
```

**الفرق:**
- Domain: يشمل جميع الـ subdomains
- URL Prefix: فقط الـ URL المحددة

### **الخطوة 3: التحقق من الملكية**

اختر من الخيارات:

#### **1️⃣ DNS TXT Record** (الأفضل)
```
1. Google يعطيك: v=google-site-verification=abc123...
2. في GoDaddy/Namecheap:
   - اذهب إلى DNS
   - أضف TXT Record
   - Name: @ (أو اسم الـ domain)
   - Value: v=google-site-verification=abc123...
3. انتظر 5 دقائق إلى 48 ساعة
4. اضغط Verify في Google Search Console
```

#### **2️⃣ HTML File** (الأسهل للـ URL Prefix)
```
1. Google يعطيك ملف: google1234567890abcdef.html
2. ضعه في: /client/public/
3. أرفعه مع الكود
4. اضغط Verify
5. Google سيبحث عن: yourdomain.com/google1234567890abcdef.html
```

#### **3️⃣ Meta Tag**
```
1. انسخ الـ content:
   <meta name="google-site-verification" content="abc123..." />
2. في client/index.html البحث عن:
   <meta name="google-site-verification" content="" />
3. أضف القيمة
4. أرفع الملف
5. اضغط Verify
```

---

## 📊 التحقق والفهرسة

### **الخطوة 1: أرسل الـ Sitemap**

```
1. في Google Search Console
2. اذهب إلى: Sitemaps (في القائمة اليسار)
3. أضغط "New sitemap"
4. أدخل: https://yourdomain.com/sitemap.xml
5. اضغط Submit
```

### **الخطوة 2: تحقق من Coverage**

```
1. اذهب إلى: Coverage
2. انظر إلى الإحصائيات:
   - Valid (أخضر) = مفهرسة بنجاح
   - Warning (أصفر) = مع تحذيرات
   - Error (أحمر) = مشاكل
```

### **الخطوة 3: فحص الصفحات**

```
1. اذهب إلى: URL Inspection
2. أدخل أي صفحة
3. انظر إلى "Coverage" و "Mobile Usability"
4. اضغط "Request Indexing" لفهرسة سريعة
```

### **الخطوة 4: اختبر robots.txt**

```
1. في Google Search Console
2. اذهب إلى: Settings → Crawl → robots.txt Tester
3. اختبر paths مختلفة
4. تأكد من أن الصفحات مسموح بها (Allow)
```

---

## ⏰ المراقبة والتحسين

### **الأسبوع الأول:**
- ✅ تحقق من القبول
- ✅ راجع Coverage report
- ✅ اطلب indexing يدويّاً للصفحات الرئيسية

### **الأسبوع الثاني:**
- ✅ انتظر الفهرسة
- ✅ راقب Performance report
- ✅ صحح أي أخطاء

### **الأسبوع الثالث والرابع:**
- ✅ يجب أن تظهر الصفحات الأولى في النتائج
- ✅ ستبدأ ترى impressions و clicks

---

## 🎯 Checklist نهائي

قبل النشر:
- [ ] الدومين مشتري وفعال
- [ ] HTTPS يعمل
- [ ] Sitemap محدثة
- [ ] robots.txt صحيح
- [ ] Meta tags كاملة
- [ ] Canonical URL صحيحة
- [ ] Mobile friendly
- [ ] Fonts محملة بشكل صحيح
- [ ] Images محسّنة
- [ ] لا روابط مكسورة

بعد النشر:
- [ ] أضفت الموقع في Google Search Console
- [ ] تحققت من الملكية
- [ ] أرسلت الـ Sitemap
- [ ] اختبرت robots.txt
- [ ] طلبت indexing للصفحات الرئيسية
- [ ] راقبت Coverage report

---

## 📞 استكشاف الأخطاء

### **المشكلة: الموقع لم يظهر بعد أسبوع**

**الحلول:**
1. تحقق من أن Google تمكنتها من الزحف (Coverage)
2. اطلب indexing يدويّاً من URL Inspection
3. تأكد من أن robots.txt يسمح بالزحف
4. تحقق من Security Issues

### **المشكلة: Errors في Coverage**

**الحلول:**
1. انقر على Error وشوف الوصف
2. اختبر الرابط في Google Search Console
3. صحح الخطأ وأعد أرساله

### **المشكلة: Mobile Usability Issues**

**الحلول:**
1. استخدم Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
2. تأكد من أن الموقع responsive
3. اختبر على هاتف فعلي

---

## 🚀 بعد النشر الناجح

### **اليوم الأول:**
- شارك الرابط على وسائل التواصل
- أرسل الموقع للأصدقاء
- سجل backlinks من وسائل التواصل

### **الأسابيع الأولى:**
- أضف محتوى جديد منتظماً
- راقب الكلمات المفتاحية الناجحة
- حسّن الصفحات الضعيفة

### **الشهر الأول:**
- لا تتوقع ظهور الموقع في أول صفحة
- ركز على جودة المحتوى
- بناء روابط من مواقع موثوقة

### **3-6 أشهر:**
- الموقع يجب أن يبدأ يظهر
- الـ ranking سيتحسن مع الوقت
- زيادة في Organic Traffic

---

## 📚 مصادر مفيدة

- [Google Search Console Help](https://support.google.com/webmasters)
- [Web Vitals](https://web.dev/vitals/)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Rich Results Test](https://search.google.com/test/rich-results)

---

**آخر تحديث:** مارس 2026

**هل تحتاج إلى مساعدة؟ اترك issue في GitHub!**
