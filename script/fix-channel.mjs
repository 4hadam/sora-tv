import { readFileSync, writeFileSync } from 'fs';

const CHANNEL_NAME = process.argv[2] || '2M Monde';
const COUNTRY = process.argv[3] || 'Morocco';

console.log(`🔍 Searching for: "${CHANNEL_NAME}"\n`);

// Fetch global IPTV.org M3U
const r = await fetch('https://iptv-org.github.io/iptv/index.m3u');
const t = await r.text();
const lines = t.replace(/\r/g, '').split('\n');

function norm(s) {
    return s.toLowerCase().replace(/\s*\[.*?\]/g, '').replace(/\s*\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').trim();
}

const targetNorm = norm(CHANNEL_NAME);
const found = [];

for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#EXTINF')) continue;
    const url = lines[i + 1]?.trim();
    if (!url || !url.startsWith('http')) continue;

    const nameMatch = lines[i].match(/,(.+)$/);
    const tvgName = lines[i].match(/tvg-name="([^"]+)"/);
    const logo = lines[i].match(/tvg-logo="([^"]+)"/)?.[1] || '';
    const hasRef = lines[i].includes('http-referrer') || lines[i - 1]?.includes('http-referrer');

    const displayName = nameMatch?.[1]?.trim() || '';
    const n = norm(displayName);
    const n2 = tvgName ? norm(tvgName[1]) : '';

    if (n === targetNorm || n2 === targetNorm || n.includes(targetNorm) || targetNorm.includes(n)) {
        found.push({ name: displayName, url, logo, hasRef });
    }
}

if (found.length === 0) {
    console.log('❌ No matches found on IPTV.org');
} else {
    console.log(`Found ${found.length} match(es):\n`);
    found.forEach((ch, i) => {
        console.log(`[${i + 1}] ${ch.name}`);
        console.log(`    URL: ${ch.url}`);
        console.log(`    Logo: ${ch.logo || 'none'}`);
        console.log(`    Needs Referrer: ${ch.hasRef ? '⚠️ YES' : '✅ NO'}`);
        console.log('');
    });
}

// Now update iptv-channels.ts with the best no-referrer URL
const best = found.find(ch => !ch.hasRef) || found[0];
if (!best) process.exit(0);

console.log(`\n💡 Best match: "${best.name}"`);
console.log(`   URL: ${best.url}`);

const channelsFile = 'shared/iptv-channels.ts';
let content = readFileSync(channelsFile, 'utf8');

// Find and replace the 2M Monde entry
const regex = new RegExp(`("name":\\s*"${CHANNEL_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^}]*"url":\\s*")[^"]+(")`);
const regex2 = new RegExp(`("url":\\s*")[^"]+("[^}]*"name":\\s*"${CHANNEL_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`);

let updated = false;

// Try replacing line by line
const srcLines = content.split('\n');
for (let i = 0; i < srcLines.length; i++) {
    if (srcLines[i].includes(`"name": "${CHANNEL_NAME}"`) && srcLines[i].includes('"url":')) {
        const oldUrl = srcLines[i].match(/"url":\s*"([^"]+)"/)?.[1];
        if (oldUrl && oldUrl !== best.url) {
            srcLines[i] = srcLines[i].replace(/"url":\s*"[^"]+"/, `"url": "${best.url}"`);
            console.log(`\n✅ Updated line ${i + 1}`);
            console.log(`   OLD: ${oldUrl}`);
            console.log(`   NEW: ${best.url}`);
            updated = true;
        } else if (oldUrl === best.url) {
            console.log('\n✅ URL is already up to date!');
        }
    }
}

if (updated) {
    writeFileSync(channelsFile, srcLines.join('\n'), 'utf8');
    console.log('\n💾 Saved to shared/iptv-channels.ts');
} else if (!updated) {
    console.log('\n⚠️  Could not find the channel line to update. Update manually.');
}
