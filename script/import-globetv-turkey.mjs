/**
 * استيراد قنوات تركيا من ملفات GlobeTV (streams_globe.json + channels_globe.json)
 * الملفات تم تحميلها من:
 * https://raw.githubusercontent.com/globetvapp/globetv.app/main/streams.json.gz
 * https://raw.githubusercontent.com/globetvapp/globetv.app/main/channels.json.gz
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// قراءة ملفات GlobeTV
const streams = JSON.parse(fs.readFileSync(path.join(ROOT, 'streams_globe.json'), 'utf8'));
const channels = JSON.parse(fs.readFileSync(path.join(ROOT, 'channels_globe.json'), 'utf8'));

// فلترة القنوات التركية
const trChannelIds = new Set(channels.filter(c => c.country === 'TR').map(c => c.id));
const trStreams = streams.filter(s => trChannelIds.has(s.channel));

console.log(`✅ إجمالي روابط تركيا من GlobeTV: ${trStreams.length}`);

// بناء خريطة channel_id -> معلومات القناة
const channelMeta = {};
channels.filter(c => c.country === 'TR').forEach(c => {
    channelMeta[c.id] = c;
});

// اختيار أفضل رابط لكل قناة (تفضيل الجودة الأعلى)
const qualityOrder = { '1080p': 5, '900p': 4, '720p': 3, '576p': 2, '480p': 1, 'SD': 0 };
const bestStreams = {};
for (const s of trStreams) {
    const existing = bestStreams[s.channel];
    if (!existing || (qualityOrder[s.quality] ?? -1) > (qualityOrder[existing.quality] ?? -1)) {
        bestStreams[s.channel] = s;
    }
}

console.log(`📡 قنوات تركيا الفريدة: ${Object.keys(bestStreams).length}`);

// قراءة ملف المشروع الحالي
const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
let content = fs.readFileSync(iptvFile, 'utf8');

// استخراج القنوات التركية الموجودة حالياً
const turkeyBlockMatch = content.match(/"Turkey":\s*\[([\s\S]*?)\]\s*,?\s*\n(?=\s*"[A-Z])/);
if (!turkeyBlockMatch) {
    console.error('❌ لم يتم إيجاد بلوك Turkey في iptv-channels.ts');
    process.exit(1);
}

// استخراج الأسماء الموجودة
const existingNames = new Set();
const existingUrls = new Set();
const nameMatches = [...content.matchAll(/"name":\s*"([^"]+)"/g)];
const urlMatches = [...content.matchAll(/"url":\s*"([^"]+)"/g)];
nameMatches.forEach(m => existingNames.add(m[1].toLowerCase().trim()));
urlMatches.forEach(m => existingUrls.add(m[1].trim()));

console.log(`📋 قنوات موجودة: ${existingNames.size}`);

// بناء إدخالات جديدة
const newEntries = [];
let skipped = 0;

for (const [channelId, stream] of Object.entries(bestStreams)) {
    const meta = channelMeta[channelId];
    const name = stream.title || meta?.name || channelId;
    const url = stream.url;

    // تخطي إذا كان URL موجود مسبقاً
    if (existingUrls.has(url)) {
        skipped++;
        continue;
    }

    // تخطي إذا كان الاسم موجود مسبقاً (تطابق تام)
    if (existingNames.has(name.toLowerCase().trim())) {
        skipped++;
        continue;
    }

    // تحديد التصنيف
    const cats = meta?.categories || [];
    let category = 'General';
    if (cats.includes('news')) category = 'News';
    else if (cats.includes('sports')) category = 'Sports';
    else if (cats.includes('entertainment')) category = 'Entertainment';
    else if (cats.includes('kids')) category = 'Kids';
    else if (cats.includes('music')) category = 'Music';
    else if (cats.includes('documentary')) category = 'Documentary';
    else if (cats.includes('business')) category = 'Business';
    else if (cats.includes('education')) category = 'Education';
    else if (cats.includes('religious')) category = 'Religious';

    // الحصول على اللوغو
    const logo = '';

    newEntries.push({
        name,
        url,
        quality: stream.quality || 'SD',
        category,
        logo,
        country: 'TR',
        channelId
    });
}

console.log(`\n📊 النتيجة:`);
console.log(`  - موجود مسبقاً (تخطي): ${skipped}`);
console.log(`  - جديد للإضافة: ${newEntries.length}`);

if (newEntries.length === 0) {
    console.log('\n✅ لا توجد قنوات جديدة للإضافة.');
    process.exit(0);
}

// بناء نص الإدخالات الجديدة
const newEntriesText = newEntries.map(e => `  {
    "name": "${e.name.replace(/"/g, '\\"')}",
    "url": "${e.url}",
    "quality": "${e.quality}",
    "category": "${e.category}",
    "logo": "${e.logo}",
    "country": "TR"
  }`).join(',\n');

// إيجاد موقع الإضافة في بلوك Turkey
const turkeyStart = content.indexOf('"Turkey": [');
if (turkeyStart === -1) {
    console.error('❌ لم يتم إيجاد بلوك Turkey');
    process.exit(1);
}

// إيجاد نهاية المصفوفة
let depth = 0;
let insertPos = -1;
let i = turkeyStart + '"Turkey": ['.length;
while (i < content.length) {
    if (content[i] === '[') depth++;
    else if (content[i] === ']') {
        if (depth === 0) {
            insertPos = i;
            break;
        }
        depth--;
    }
    i++;
}

if (insertPos === -1) {
    console.error('❌ لم يتم إيجاد نهاية مصفوفة Turkey');
    process.exit(1);
}

// الإضافة قبل نهاية المصفوفة
const newContent = content.slice(0, insertPos) + ',\n' + newEntriesText + '\n' + content.slice(insertPos);

fs.writeFileSync(iptvFile, newContent, 'utf8');

console.log(`\n🎉 تم إضافة ${newEntries.length} قناة تركية جديدة من GlobeTV!`);
console.log('\nأمثلة على القنوات المضافة:');
newEntries.slice(0, 10).forEach(e => console.log(`  - ${e.name} (${e.quality}): ${e.url}`));
