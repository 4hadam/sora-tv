# 🔍 Google Search Console Setup Guide

## خطوات ربط الدومين مع Google Search Console

### 1️⃣ **إنشء حساب / دخول Google Search Console**
- اذهب إلى: https://search.google.com/search-console
- سجل دخول ببريدك الإلكتروني على Google

### 2️⃣ **إضافة الدومين (Property)**

#### الطريقة الأولى: Domain Property (موصى بها)
```
1. اختر "URL prefix" في الخانة اليسار
2. أدخل دومينك: https://yourdomain.com
3. اضغط Continue
```

#### الطريقة الثانية: URL Prefix Property
```
1. اختر "Domain" في الخانة اليسار
2. أدخل دومينك: yourdomain.com
3. ستحتاج للتحقق من ملكية الدومين عبر DNS
```

---

## 3️⃣ **التحقق من ملكية الدومين**

### خيار A: HTML File Verification (الأسهل)
```
1. Google سيعطيك ملف: google[random].html
2. ضع الملف في: /client/public/google[random].html
3. اضغط Verify
```

### خيار B: DNS TXT Record
```
1. انسخ TXT record من Google Search Console
2. أضفه في إعدادات DNS لدومينك
3. انتظر حتى 48 ساعة للتحقق
```

### خيار C: Google Analytics
```
إذا كان لديك Google Analytics مربوط:
1. Google سيتحقق تلقائياً
2. قد يستغرق بعض الوقت
```

---

## 4️⃣ **إرسال الـ Sitemap**

بعد التحقق:
```
1. اذهب إلى: Sitemaps (في القائمة اليسار)
2. أضغط "Add/test sitemap"
3. أدخل: https://yourdomain.com/sitemap.xml
4. اضغط Submit
```

---

## 5️⃣ **التحقق من robots.txt**

```
1. اذهب إلى: Coverage
2. اضغط على robots.txt tester
3. أدخل: /robots.txt
4. تأكد من أن جميع الصفحات مسموح بها (Allow)
```

---

## 6️⃣ **فحص الأخطاء**

### Coverage Report
- تحقق من عدد الصفحات المفهرسة
- ابحث عن الأخطاء والتحذيرات

### URL Inspection Tool
```
1. أدخل أي URL من موقعك
2. تحقق من أن Google يستطيع فهرستها
3. اضغط "Request indexing" إذا لم تكن مفهرسة
```

### Mobile Usability
- تأكد من أن الموقع يعمل بشكل جيد على الهاتف
- الموقع responsive - ✅

---

## 7️⃣ **تحسينات SEO المطبقة**

### ✅ في الموقع:

1. **Structured Data (JSON-LD)**
   - Organization schema
   - WebSite schema
   - SearchAction schema

2. **Meta Tags**
   - Title (موضح في صفحة واحدة فقط)
   - Description (مختصر و جذاب)
   - Canonical URL (ديناميكية)

3. **Open Graph Tags**
   - og:title
   - og:description
   - og:image
   - og:type

4. **Twitter Card Tags**
   - twitter:card
   - twitter:title
   - twitter:description
   - twitter:image

5. **Sitemap**
   - `/sitemap.xml` محدثة
   - تحتوي على جميع الفئات الرئيسية
   - Priority و changefreq محددة

6. **robots.txt**
   - Allow جميع الصفحات
   - Disallow فقط الصفحات الخاصة
   - Friendly للـ crawlers

7. **Mobile Optimization**
   - Responsive design ✅
   - Mobile meta tags ✅
   - Fast loading ✅

---

## 8️⃣ **مراقبة الأداء**

### استخدم هذه التقارير:

1. **Performance**
   - عدد الـ impressions
   - عدد الـ clicks
   - CTR (نسبة النقرات)
   - متوسط الموضع في النتائج

2. **Coverage**
   - الصفحات المفهرسة
   - الأخطاء
   - التحذيرات

3. **Enhancements**
   - في الموقع: لا توجد أخطاء عادة
   - المنتجات: إذا كان لديك تجارة إلكترونية

4. **Security Issues**
   - تفقد بانتظام
   - أصلح أي مشاكل فوراً

---

## 9️⃣ **نصائح للحصول على ترتيب أفضل**

### Content Tips:
- 📝 أضف محتوى فريد ومفيد
- 🔑 استخدم الكلمات المفتاحية بطبيعية
- 🎯 اكتب عناوين جذابة (50-60 حرف)
- 📄 أوصاف واضحة (150-160 حرف)

### Technical Tips:
- ⚡ سرعة التحميل مهمة جداً
- 📱 تأكد من mobile-first indexing
- 🔗 روابط داخلية قوية
- 🖼️ صور بجودة عالية مع alt text

### Link Building:
- 🔗 احصل على روابط من مواقع موثوقة
- 📰 اطلب من المدونين فحص موقعك
- 🌐 استخدم وسائل التواصل الاجتماعي

---

## 🔟 **أوامر مفيدة**

### اختبر robots.txt:
```
موقع Google: https://search.google.com/search-console/debug
```

### اختبر Mobile Compatibility:
```
موقع Google: https://search.google.com/test/mobile-friendly
```

### اختبر Structured Data:
```
موقع Google: https://search.google.com/test/rich-results
```

---

## 📋 **Checklist قبل النشر**

- [ ] الدومين مشتري وفعال
- [ ] HTTPS مفعل (SSL certificate)
- [ ] الموقع responsive على الهاتف
- [ ] سرعة التحميل جيدة (< 3 ثواني)
- [ ] Favicon مضاف
- [ ] Meta tags كاملة
- [ ] Sitemap موجود و محدث
- [ ] robots.txt صحيح
- [ ] Structured data صحيح
- [ ] لا توجد روابط مكسورة (404)
- [ ] صور محسّنة و مضغوطة
- [ ] Content أصلي و مفيد

---

## 🚀 **بعد 30 يوم**

1. تحقق من Search Console
2. ابحث عن الكلمات المفتاحية الناجحة
3. حسّن الصفحات الضعيفة
4. أضف محتوى جديد منتظماً

---

## ⚠️ **تجنب هذه الأخطاء**

❌ لا تحاول نشر روابط وهمية
❌ لا تستخدم محتوى مكرر من مواقع أخرى
❌ لا تشتري روابط خارجية
❌ لا تستخدم keyword stuffing
❌ لا تخفي نصاً (الخط الأبيض على خلفية بيضاء)

---

**ملاحظة:** قد يستغرق ظهور موقعك في نتائج البحث من 2-4 أسابيع بعد الفهرسة.

تحديث أخير: مارس 2026
