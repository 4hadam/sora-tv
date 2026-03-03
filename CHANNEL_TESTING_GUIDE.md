# شرح آلية التحقق من القنوات الشغالة

## المبدأ الأساسي

كل قناة لها **URL** (رابط):
```
https://example.com/stream/channel.m3u8
```

نحتاج للتحقق من أن هذا الرابط **يعمل** و**يوفر بث حي**.

---

## الطريقة 1: في `cleanup-channels.ts`

### دالة `testChannel()`

```typescript
async function testChannel(channel: IPTVChannel): Promise<boolean> {
    // 1️⃣ تخصص القنوات (YouTube)
    if (channel.url.includes("youtube") || channel.url.includes("embed")) {
        return true; // YouTube دائماً يعتبر شغال
    }
    
    // 2️⃣ التحقق من أن الرابط يبدأ بـ http
    if (!channel.url.startsWith("http")) return false;
    
    // 3️⃣ إرسال طلب HEAD (خفيف) إلى الخادم
    const response = await fetch(channel.url, {
        method: "HEAD",  // ← طلب خفيف بدون تحميل الملف كاملاً
        timeout: 3000,   // ← انتظر 3 ثوان فقط
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    // 4️⃣ تحقق من الاستجابة
    return response.status < 500;
    // ✅ 200-499 = القناة شغالة
    // ❌ 500-599 = أخطاء الخادم
    // ⏱️ > 3000ms = انقطاع، تُعتبر غير شغالة
}
```

### آلية العمل خطوة بخطوة:

```
القناة: "Al Jazeera" → https://stream.aljazeera.net/live

1. هل تحتوي على "youtube"؟ → لا
2. هل تبدأ بـ http؟ → نعم ✓
3. أرسل HEAD request للـ URL
   ↓
الخادم يرد مع كود الحالة:
   • 200 OK → ✅ شغالة
   • 404 Not Found → ❌ غير شغالة
   • 500 Server Error → ❌ الخادم معطل
   • Timeout (>3s) → ❌ بطيئة جداً
```

---

## الطريقة 2: في `update-iptv-channels.ts`

```typescript
async function testChannelUrl(url: string): Promise<boolean> {
    try {
        // 1️⃣ محاولة HEAD request أولاً (أسرع)
        const response = await axios.head(url, {
            timeout: 5000,      // ← انتظر 5 ثوان
            maxRedirects: 5     // ← اتبع الـ redirects
        });
        return response.status >= 200 && response.status < 400;
    } catch {
        // 2️⃣ إذا فشل HEAD، جرّب GET request
        try {
            const response = await axios.get(url, {
                timeout: 5000,
                maxRedirects: 5
            });
            return response.status >= 200 && response.status < 400;
        } catch {
            // ❌ فشل كلا النوعين
            return false;
        }
    }
}
```

---

## الفروقات بين الطريقتين

| الميزة | cleanup-channels | update-iptv-channels |
|--------|------------------|----------------------|
| **طريقة الفحص** | HEAD request | HEAD ثم GET |
| **Timeout** | 3 ثواني | 5 ثواني |
| **YouTube** | يقبل كل روابط YouTube | يفحص كل شيء |
| **الحجم** | خفيف (بدون تحميل) | قد يحمل بيانات |
| **السرعة** | أسرع | أبطأ قليلاً |

---

## أكواد الحالة HTTP

```
2xx (نجاح)
  200 OK → ✅ القناة شغالة طبيعي
  206 Partial Content → ✅ شغالة (streaming partial)

3xx (إعادة توجيه)
  301, 302, 307 → ✅ يتبع الـ redirect و يختبر الرابط الجديد

4xx (خطأ العميل)
  400 Bad Request → ❌
  403 Forbidden → ❌
  404 Not Found → ❌ الرابط غير موجود

5xx (خطأ الخادم)
  500 Internal Server Error → ❌ معطل مؤقتاً
  503 Service Unavailable → ❌ معطل الآن
```

---

## كيف يعمل `testBatch()`؟

اختبار 5 قنوات معاً بدلاً من واحدة تلو الأخرى (أسرع 5x):

```typescript
async function testBatch(channels: IPTVChannel[]): Promise<boolean[]> {
    const results = [];
    
    // معالجة 5 قنوات في نفس الوقت
    for (let i = 0; i < channels.length; i += 5) {
        const batch = channels.slice(i, i + 5);
        
        // Promise.all = اختبر كل 5 معاً (في موازي)
        const batchResults = await Promise.all(
            batch.map(testChannel)
        );
        
        results.push(...batchResults);
    }
    
    return results;
}
```

### مثال:
```
القنوات: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
MAX_CONCURRENT = 5

الدفعة الأولى (معاً): 1, 2, 3, 4, 5 → 3 ثوان
الدفعة الثانية (معاً): 6, 7, 8, 9, 10 → 3 ثوان
────────────────────────────────────────
المجموع: 6 ثوان (وليس 30 ثانية!)
```

---

## مثال عملي: تشغيل التنظيف

```bash
npm run cleanup-channels
```

الإخراج:
```
🗑️  Cleaning Dead Channels

[01/51] Morocco               45/50 (removed 5)
[02/51] Saudi Arabia         32/40 (removed 8)
[03/51] UAE                  28/30 (removed 2)
...
[51/51] Zimbabwe             15/20 (removed 5)

============================================================
✅ Cleanup Complete!
============================================================
Total cleaned: 1250/1400
Removed:      150 dead channels
Time:         45.2s
```

---

## كيفية تحسين دقة الاختبار

### إضافة اختبار فعلي للبث (Advanced)

بدلاً من اختبار الرابط فقط، يمكن اختبار تحميل أول 1KB من الملف:

```typescript
async function testChannelStream(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, {
            headers: { 'Range': 'bytes=0-1000' } // اطلب أول 1KB فقط
        });
        
        // إذا أرجع 206 = يدعم البث
        return response.status === 206 || response.status === 200;
    } catch {
        return false;
    }
}
```

---

## ملخص

| الخطوة | الوصف |
|-------|-------|
| 1️⃣ | أرسل `HEAD request` للـ URL |
| 2️⃣ | انتظر الرد (مع timeout) |
| 3️⃣ | افحص كود الحالة HTTP |
| 4️⃣ | إذا كان `< 500` = شغال ✅ |
| 5️⃣ | خزن النتائج وحذف الميتة |
| 6️⃣ | احفظ القائمة المحدثة |

---

## أوامر مفيدة

```bash
# تنظيف جميع القنوات
npm run cleanup-channels

# تحديث القنوات من مصادر جديدة
npm run update-channels

# اختبار قناة واحدة يدويّاً (curl)
curl -I https://example.com/stream.m3u8
# -I = اطلب رأس الرسالة فقط (HEAD)
```
