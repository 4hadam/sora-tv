# دليل تشغيل الـ Scripts

## تشغيل السكريبتات بشكل صحيح

كل السكريبتات في مجلد `script/` يجب تشغيلها باستخدام `tsx` من `node_modules`:

### 1. تحديث قنوات IPTV
```bash
node_modules\.bin\tsx script/update-iptv-channels.ts
```

أو على Linux/Mac:
```bash
node_modules/.bin/tsx script/update-iptv-channels.ts
```

**الغرض:** جلب قنوات IPTV الجديدة من مصادر موثوقة واختبارها

**الوقت:** 5-10 دقائق (يعتمد على السرعة الإنترنت)

---

### 2. تنظيف القنوات غير الشغالة
```bash
node_modules\.bin\tsx script/cleanup-channels.ts
```

أو على Linux/Mac:
```bash
node_modules/.bin/tsx script/cleanup-channels.ts
```

**الغرض:** اختبار جميع القنوات وحذف التي لا تعمل

**الوقت:** 1-3 دقائق

---

## شرح المنطق

### update-iptv-channels.ts
1. يجلب البيانات من 3 مصادر IPTV موثوقة:
   - IPTV.org Index
   - Arabic Channels
   - English Channels

2. لكل قناة:
   - يختبر الـ URL
   - يستخرج اسم الدولة من البيانات
   - يتحقق من أنها ليست تكرار

3. يحفظ البيانات في `shared/iptv-channels.ts`

---

### cleanup-channels.ts
1. يحمل كل القنوات الموجودة
2. لكل قناة:
   - يختبر الـ URL بـ HEAD request
   - YouTube يُترك دائماً (لا يختبر)
   - إذا كانت الاستجابة < 500 = القناة تعمل

3. يحفظ فقط القنوات الشغالة

---

## الخطأ الشائع
إذا حصلت على: `'tsx' is not recognized`

**الحل:**
```bash
node_modules\.bin\tsx script/update-iptv-channels.ts
```

الاستخدام المباشر من `node_modules\.bin` يضمن أن tsx سيعمل بشكل صحيح.

---

## الإضافة إلى package.json (اختياري)
للتسهيل، يمكنك أن تضيف في `scripts` في package.json:

```json
{
  "scripts": {
    "update-channels": "node_modules/.bin/tsx script/update-iptv-channels.ts",
    "cleanup-channels": "node_modules/.bin/tsx script/cleanup-channels.ts"
  }
}
```

ثم شغّل:
```bash
npm run update-channels
npm run cleanup-channels
```
