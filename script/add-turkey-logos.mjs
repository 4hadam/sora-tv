/**
 * إضافة شعارات قنوات تركيا من ملف logos.json الخاص بـ GlobeTV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const logos = JSON.parse(fs.readFileSync(path.join(ROOT, 'logos_globe.json'), 'utf8'));
const channels = JSON.parse(fs.readFileSync(path.join(ROOT, 'channels_globe.json'), 'utf8'));

// بناء خريطة channel_id -> logo URL
const logoMap = {};
for (const l of logos) {
    if (!logoMap[l.channel]) logoMap[l.channel] = l.url;
}

// بناء خريطة اسم القناة -> logo URL (عبر channel_id)
const nameToLogo = {};
for (const c of channels) {
    if (c.country === 'TR' && logoMap[c.id]) {
        nameToLogo[c.name.toLowerCase().trim()] = logoMap[c.id];
        // أيضاً بدون "TV" أو مع مسافات مختلفة
        nameToLogo[c.name.trim()] = logoMap[c.id];
    }
}

console.log(`🖼️ شعارات TR متاحة: ${Object.keys(nameToLogo).length / 2}`);

// قراءة ملف المشروع
const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
let content = fs.readFileSync(iptvFile, 'utf8');

// إيجاد بلوك Turkey والاستبدال
let updated = 0;
let notFound = 0;

// استبدال "logo": "" بالشعار الصحيح للقنوات التركية فقط
// أولاً نجد بلوك Turkey
const turkeyStart = content.indexOf('"Turkey": [');
const turkeyEnd = (() => {
    let depth = 0;
    let pos = turkeyStart + '"Turkey": ['.length;
    while (pos < content.length) {
        if (content[pos] === '[') depth++;
        else if (content[pos] === ']') {
            if (depth === 0) return pos + 1;
            depth--;
        }
        pos++;
    }
    return -1;
})();

const before = content.slice(0, turkeyStart);
let turkeyBlock = content.slice(turkeyStart, turkeyEnd);
const after = content.slice(turkeyEnd);

// استبدال logo في بلوك Turkey - يدعم الشكل multiline
// البحث عن كل مدخلة: "name": "..." ... "logo": ""
turkeyBlock = turkeyBlock.replace(
    /("name":\s*"([^"]+)"[\s\S]*?"logo":\s*)"([^"]*)"/g,
    (match, prefix, name, logo) => {
        const logoUrl = nameToLogo[name.trim()] || nameToLogo[name.toLowerCase().trim()] || logo;
        if (logoUrl && logoUrl !== logo) updated++;
        else notFound++;
        return `${prefix}"${logoUrl || ''}"`;
    }
);

content = before + turkeyBlock + after;
fs.writeFileSync(iptvFile, content, 'utf8');

console.log(`✅ شعارات أُضيفت: ${updated}`);
console.log(`⚠️  بدون شعار: ${notFound}`);

// طباعة القنوات التي لم يُعثر لها على شعار
const noLogoChannels = [];
turkeyBlock.replace(/"name":\s*"([^"]+)","url":[^}]+,"logo":\s*""/g, (m, name) => {
    noLogoChannels.push(name);
});
if (noLogoChannels.length > 0) {
    console.log('\nقنوات بدون شعار:');
    noLogoChannels.forEach(n => console.log('  -', n));
}
