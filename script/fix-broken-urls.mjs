// Smart URL updater - replaces old URLs with fresh ones from IPTV.org
// Strategy: match channels by name => update to IPTV.org latest URL
// Much faster than testing each URL individually

import { readFileSync, writeFileSync } from 'fs';

const FILE_PATH = new URL('../shared/iptv-channels.ts', import.meta.url)
  .pathname.replace(/^\/([A-Z]:)/, '$1');

function norm(s) {
  return s.toLowerCase()
    .replace(/\s*\[.*?\]/g, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

console.log('Fetching latest streams from IPTV.org...');
const m3uText = await fetch('https://iptv-org.github.io/iptv/index.m3u').then(r => r.text());
const m3uLines = m3uText.replace(/\r/g, '').split('\n');
console.log('Lines fetched: ' + m3uLines.length);

const freshMap = new Map();
for (let i = 0; i < m3uLines.length; i++) {
  const line = m3uLines[i];
  if (!line.startsWith('#EXTINF')) continue;
  const urlLine = m3uLines[i + 1]?.trim();
  if (!urlLine || urlLine.startsWith('#') || !urlLine.startsWith('http')) continue;
  const nameMatch = line.match(/,(.+)$/);
  const tvgName   = line.match(/tvg-name="([^"]+)"/);
  const logoMatch = line.match(/tvg-logo="(https?:\/\/[^"]+)"/);
  const names = new Set();
  if (nameMatch) names.add(norm(nameMatch[1].trim()));
  if (tvgName)   names.add(norm(tvgName[1]));
  for (const key of names) {
    if (key && !freshMap.has(key)) {
      freshMap.set(key, { url: urlLine, logo: logoMatch?.[1] || null });
    }
  }
}
console.log('Fresh map size: ' + freshMap.size);

const srcLines = readFileSync(FILE_PATH, 'utf8').split('\n');
const outLines = [...srcLines];
let updated = 0;
let logosAdded = 0;
const changes = [];

for (let i = 0; i < srcLines.length; i++) {
  const line = srcLines[i];
  if (!line.includes('"url":') || !line.includes('"name":')) continue;
  const urlMatch = line.match(/"url":\s*"([^"]+)"/);
  if (!urlMatch) continue;
  const oldUrl = urlMatch[1];
  if (oldUrl.includes('youtube') || oldUrl.includes('youtu.be') || oldUrl.includes('embed')) continue;
  const nameMatch = line.match(/"name":\s*"([^"]+)"/);
  if (!nameMatch) continue;
  const key = norm(nameMatch[1]);
  const fresh = freshMap.get(key);
  if (!fresh || fresh.url === oldUrl) continue;

  let newLine = line.replace(/"url":\s*"[^"]+"/, '"url": "' + fresh.url + '"');
  if (!line.includes('"logo":') && fresh.logo) {
    newLine = newLine.replace(/("category":\s*"[^"]+")(\s*})/, '$1, "logo": "' + fresh.logo + '"$2');
    logosAdded++;
  }
  outLines[i] = newLine;
  updated++;
  changes.push(nameMatch[1] + '\n    OLD: ' + oldUrl + '\n    NEW: ' + fresh.url);
}

if (updated > 0) {
  writeFileSync(FILE_PATH, outLines.join('\n'), 'utf8');
}

console.log('');
console.log('========================================');
console.log('Updated: ' + updated + ' channel URLs');
console.log('Logos added: ' + logosAdded);
console.log('========================================');

if (changes.length > 0) {
  const log = '=== URL Update Log - ' + new Date().toISOString() + ' ===\nTotal: ' + updated + '\n\n' + changes.join('\n\n');
  writeFileSync('script/url-update-log.txt', log, 'utf8');
  console.log('Log saved: script/url-update-log.txt');
  console.log('Sample:');
  changes.slice(0, 3).forEach(c => console.log(c));
}
