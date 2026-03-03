import { readFileSync, writeFileSync } from 'fs';

// Fetch YouTube live page for 2M Maroc
const res = await fetch('https://www.youtube.com/@2MMAROC/live', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
});
const html = await res.text();

const videoMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
const channelMatch = html.match(/"channelId":"(UC[^"]+)"/);
const titleMatch = html.match(/"title":"([^"]+)"/);

const videoId = videoMatch?.[1];
const channelId = channelMatch?.[1];

console.log('Video ID:', videoId || 'not found');
console.log('Channel ID:', channelId || 'not found');
console.log('Title:', titleMatch?.[1] || 'unknown');

if (!videoId && !channelId) {
    console.log('\n⚠️  Could not auto-detect. Trying 2M official site...');
    const r2 = await fetch('https://www.2m.ma', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const h2 = await r2.text();
    const m2 = h2.match(/https?:\/\/[^\s"'<>]+\.m3u8/);
    console.log('Stream on 2m.ma:', m2?.[0] || 'not found');
    process.exit(0);
}

// Build YouTube embed URL
const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : `https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}`;

console.log('\n✅ New URL to use:', embedUrl);

// Update iptv-channels.ts
const FILE = 'shared/iptv-channels.ts';
const lines = readFileSync(FILE, 'utf8').split('\n');
let updated = 0;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('"name": "2M Monde"') && lines[i].includes('"url":')) {
        const old = lines[i].match(/"url":\s*"([^"]+)"/)?.[1];
        lines[i] = lines[i].replace(/"url":\s*"[^"]+"/, `"url": "${embedUrl}"`);
        console.log(`\nUpdated line ${i + 1}`);
        console.log('  OLD:', old);
        console.log('  NEW:', embedUrl);
        updated++;
    }
}

if (updated > 0) {
    writeFileSync(FILE, lines.join('\n'), 'utf8');
    console.log('\n💾 Saved!');
} else {
    console.log('\n⚠️  Channel line not found in iptv-channels.ts');
    console.log('Please update manually with:', embedUrl);
}
