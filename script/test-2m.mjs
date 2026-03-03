// Search for 2M Monde alternative URLs and fix it
import { readFileSync, writeFileSync } from 'fs';

// Known alternative URLs to try for 2M Monde
const alternatives = [
    'https://live.2m.ma/hls/live.m3u8',
    'https://streaming.2m.ma/live/2m.m3u8',
    'https://edge1.2m.ma/2m/live.stream/playlist.m3u8',
    'https://www.youtube-nocookie.com/embed/live_stream?channel=UCBkuJYZhJo7bXwnVL4PKqOQ',
];

const TIMEOUT = 6000;

async function testUrl(url) {
    if (url.includes('youtube') || url.includes('youtu.be')) return true;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
        const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
        clearTimeout(t);
        return res.status < 400;
    } catch {
        clearTimeout(t);
        return false;
    }
}

console.log('Testing 2M Monde alternative URLs...\n');

for (const url of alternatives) {
    const ok = await testUrl(url);
    console.log(`${ok ? '✅' : '❌'} ${url}`);
}

// Also test current URL with & without referrer
const currentUrl = 'https://cdn-globecast.akamaized.net/live/eds/2m_monde/hls_video_ts_tuhawxpiemz257adfc/2m_monde.m3u8';
const okCurrent = await testUrl(currentUrl);
console.log(`\nCurrent URL: ${okCurrent ? '✅ WORKS' : '❌ BROKEN'}`);
console.log(currentUrl);
