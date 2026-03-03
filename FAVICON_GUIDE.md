# إنشاء الصور المصغرة (Favicon) للموقع

## ✅ تم الإنشاء:

### 1. **sora-logo.svg** 
- الشعار الأساسي بصيغة SVG
- يحتوي على: الدائرة الحمراء + الصليب البرتقالي + الـ V الملون
- قابل للتوسع (Scalable)
- يتم استخدامه مباشرة كـ favicon في المتصفحات الحديثة

### 2. **الوصول إلى الشعار:**
```
https://sora.tv/sora-logo.svg
```

---

## 📋 الملفات المطلوبة

كل ملف له حجم مختلف لاستخدام مختلف:

| ملف | الحجم | الاستخدام |
|------|-------|----------|
| `favicon.ico` | 16x16, 32x32, 48x48 | النوافذ المتعددة، الشريط |
| `favicon.png` | 32x32 | متصفحات قديمة |
| `apple-touch-icon.png` | 180x180 | أيقونة iPhone/iPad |
| `android-chrome-192.png` | 192x192 | Android |
| `android-chrome-512.png` | 512x512 | Android عالي الدقة |
| `sora-logo.svg` | أي حجم | المتصفحات الحديثة ✅ |

---

## 🛠️ كيفية إنشاء الصور PNG

### الطريقة 1: استخدام ImageMagick (سطر الأوامر)
```bash
# Windows
magick convert client/public/sora-logo.svg -background none -size 192x192 client/public/android-chrome-192.png
magick convert client/public/sora-logo.svg -background none -size 512x512 client/public/android-chrome-512.png
magick convert client/public/sora-logo.svg -background none -size 180x180 client/public/apple-touch-icon.png
```

### الطريقة 2: استخدام Online Tools
1. ذهب إلى: https://convertio.co/svg-png/
2. اختر `sora-logo.svg`
3. اضبط الحجم (192x192, 512x512, 180x180)
4. حمّل الصور

### الطريقة 3: استخدام Figma (متقدم)
1. فتح Figma
2. استيراد SVG
3. تصدير بأحجام مختلفة

---

## 🔄 تحديث HTML (✅ تم)

تم تحديث `client/index.html`:

```html
<!-- 🟢 Icons -->
<link rel="icon" type="image/svg+xml" href="/sora-logo.svg" />
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

## 📱 إضافة Web App Manifest (اختياري)

إنشاء `client/public/manifest.json`:

```json
{
  "name": "Sora.tv - Watch Live World TV",
  "short_name": "Sora.tv",
  "description": "Stream free live TV from 193+ countries",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#000000",
  "icons": [
    {
      "src": "/sora-logo.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    },
    {
      "src": "/android-chrome-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

ثم أضِف في HTML:
```html
<link rel="manifest" href="/manifest.json" />
```

---

## ✅ الخطوات التالية

1. ✅ تم: إنشاء `sora-logo.svg`
2. ✅ تم: تحديث `index.html`
3. ⏳ المتبقي: تحويل SVG إلى PNG (يدويّاً أو أتوماتيكياً)
4. ⏳ المتبقي: إضافة `manifest.json` (اختياري للـ PWA)

---

## 🧪 اختبار الـ Favicon

```bash
# تحقق من الـ favicon
curl -I https://sora.tv/sora-logo.svg

# يجب أن ترى:
# HTTP/1.1 200 OK
# Content-Type: image/svg+xml
```

---

## 📊 نتيجة النهاية

عندما تفتح الموقع في المتصفح:
- ✅ الشعار يظهر في تبويب المتصفح
- ✅ الشعار يظهر في المفضلة
- ✅ الشعار يظهر عند التثبيت على الهاتف (PWA)

![Sora Favicon](sora-logo.svg)
