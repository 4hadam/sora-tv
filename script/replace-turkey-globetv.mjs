/**
 * استبدال قنوات تركيا - HTTPS أولاً + شعارات من GlobeTV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const streams = JSON.parse(fs.readFileSync(path.join(ROOT, 'streams_globe.json'), 'utf8'));
const channels = JSON.parse(fs.readFileSync(path.join(ROOT, 'channels_globe.json'), 'utf8'));
const logos = JSON.parse(fs.readFileSync(path.join(ROOT, 'logos_globe.json'), 'utf8'));

// خريطة شعارات
const logoMap = {};
for (const l of logos) {
    if (!logoMap[l.channel]) logoMap[l.channel] = l.url;
}

// قنوات تركيا
const trChannels = channels.filter(c => c.country === 'TR');
const trChannelIds = new Set(trChannels.map(c => c.id));
const channelMeta = Object.fromEntries(trChannels.map(c => [c.id, c]));

// روابط تركيا
const trStreams = streams.filter(s => trChannelIds.has(s.channel));

const qualityScore = { '1080p': 6, '900p': 5, '720p': 4, '576p': 3, '480p': 2, '360p': 1, 'SD': 0 };

// اختيار أفضل رابط: HTTPS أولاً، ثم الجودة الأعلى
const bestStreams = {};
for (const s of trStreams) {
    const isHttps = s.url.startsWith('https://');
    const score = (qualityScore[s.quality] ?? 0);

    if (!bestStreams[s.channel]) {
        bestStreams[s.channel] = { ...s, _https: isHttps, _score: score };
        continue;
    }

    const ex = bestStreams[s.channel];
    // HTTPS يفوز دائماً على HTTP
    if (!ex._https && isHttps) {
        bestStreams[s.channel] = { ...s, _https: isHttps, _score: score };
    } else if (ex._https === isHttps && score > ex._score) {
        bestStreams[s.channel] = { ...s, _https: isHttps, _score: score };
    }
}

// تحديد التصنيف
function getCategory(meta) {
    const cats = meta?.categories || [];
    if (cats.includes('news')) return 'News';
    if (cats.includes('sports')) return 'Sports';
    if (cats.includes('entertainment')) return 'Entertainment';
    if (cats.includes('kids')) return 'Kids';
    if (cats.includes('music')) return 'Music';
    if (cats.includes('documentary')) return 'Documentary';
    if (cats.includes('business')) return 'Business';
    if (cats.includes('education')) return 'Education';
    if (cats.includes('religious')) return 'Religious';
    return 'General';
}

const httpsCount = Object.values(bestStreams).filter(s => s._https).length;
const httpCount = Object.values(bestStreams).filter(s => !s._https).length;
console.log(`📡 قنوات تركيا: ${Object.keys(bestStreams).length}`);
console.log(`✅ HTTPS: ${httpsCount} | ⚠️  HTTP فقط (لا بديل HTTPS): ${httpCount}`);

if (httpCount > 0) {
    console.log('\nقنوات HTTP بدون بديل HTTPS:');
    Object.entries(bestStreams).filter(([, s]) => !s._https).forEach(([id, s]) => {
        console.log(`  - ${channelMeta[id]?.name || id}: ${s.url}`);
    });
}

// بناء الإدخالات
const entries = Object.entries(bestStreams).map(([channelId, stream]) => {
    const meta = channelMeta[channelId];
    const name = meta?.name || stream.title || channelId;
    const url = stream.url;
    const category = getCategory(meta);
    const logo = logoMap[channelId] || '';

    return `  {\n    "name": "${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",\n    "url": "${url}",\n    "category": "${category}",\n    "logo": "${logo}"\n  }`;
});

// قراءة الملف واستبدال بلوك Turkey
const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
let content = fs.readFileSync(iptvFile, 'utf8');

const blockKey = '"Turkey": [';
const blockStart = content.indexOf(blockKey);
if (blockStart === -1) { console.error('❌ لم يتم إيجاد بلوك Turkey'); process.exit(1); }

let depth = 0, pos = blockStart + blockKey.length, endPos = -1;
while (pos < content.length) {
    if (content[pos] === '[') depth++;
    else if (content[pos] === ']') {
        if (depth === 0) { endPos = pos; break; }
        depth--;
    }
    pos++;
}

const newContent = content.slice(0, blockStart + blockKey.length) + '\n' + entries.join(',\n') + '\n' + content.slice(endPos);
fs.writeFileSync(iptvFile, newContent, 'utf8');

console.log(`\n🎉 تم استبدال بلوك Turkey بـ ${entries.length} قناة (HTTPS أولاً + شعارات)`);
