/**
 * محاولة أخيرة لبقية القنوات التركية
 */
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SOURCES = {
    "Sat7 Türk": [
        "https://sat7turk.com/wp-content/themes/sat7-turk/assets/images/logo.png",
        "https://sat7turk.com/wp-content/uploads/2021/02/sat7-turk-logo-white.png",
    ],
    "Teve2": [
        "https://www.teve2.com.tr/Content/img/teve2-logo-header.png",
        "https://cdnimages.teve2.com.tr/teve2-logo.png",
    ],
    "TV 24": [
        "https://www.tv24.com.tr/Imgs/logoNew.png",
        "https://www.tv24.com.tr/images/logo.png",
    ],
    "Bursa AS TV": [
        "https://bursaastv.com/wp-content/uploads/logo.png",
        "https://www.bursaas.tv/logo.png",
    ],
    "Torba TV": [
        "https://torbatv.com/logo.png",
    ],
    "Helwa TV": [
        "https://helwatv.com/logo.png",
        "https://helwatv.net/logo.png",
    ],
    "Satranç TV": [
        "https://satrancfederasyonu.org.tr/images/logo.png",
    ],
};

const HOMEPAGES = {
    "Sat7 Türk": "https://sat7turk.com/",
    "Teve2": "https://www.teve2.com.tr/",
    "TV 24": "https://www.tv24.com.tr/",
    "Bursa AS TV": "https://bursaastv.com/",
    "Helwa TV": "https://helwatv.com/",
};

function tryUrl(url) {
    return new Promise(resolve => {
        const mod = url.startsWith('https') ? https : http;
        try {
            const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
                const ct = res.headers['content-type'] || '';
                res.resume();
                resolve(res.statusCode === 200 && ct.startsWith('image') ? url : null);
            });
            req.on('error', () => resolve(null));
            req.setTimeout(8000, () => { req.destroy(); resolve(null); });
        } catch { resolve(null); }
    });
}

function scrapeOgImage(url) {
    return new Promise(resolve => {
        const mod = url.startsWith('https') ? https : http;
        try {
            const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    const m = data.match(/property="og:image"\s+content="([^"]+)"/) ||
                        data.match(/content="([^"]+)"\s+property="og:image"/);
                    resolve(m && m[1].startsWith('http') ? m[1] : null);
                });
            });
            req.on('error', () => resolve(null));
            req.setTimeout(10000, () => { req.destroy(); resolve(null); });
        } catch { resolve(null); }
    });
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const results = {};

    for (const [name, urls] of Object.entries(SOURCES)) {
        let found = null;
        for (const url of urls) {
            found = await tryUrl(url);
            if (found) { console.log(`✅ img  ${name} → ${url}`); break; }
            await delay(150);
        }

        if (!found && HOMEPAGES[name]) {
            const og = await scrapeOgImage(HOMEPAGES[name]);
            if (og) { found = og; console.log(`✅ og   ${name} → ${og}`); }
        }

        if (!found) console.log(`❌ ${name}`);
        else results[name] = found;
        await delay(200);
    }

    console.log(`\nFound: ${Object.keys(results).length}/${Object.keys(SOURCES).length}`);
    if (!Object.keys(results).length) return;

    const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
    let content = fs.readFileSync(iptvFile, 'utf8');

    let updated = 0;
    for (const [name, logo] of Object.entries(results)) {
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pat = new RegExp(`(name: "${esc}"[^}]+logo: )""`, 'g');
        const prev = content;
        content = content.replace(pat, `$1"${logo}"`);
        if (content !== prev) updated++;
    }

    fs.writeFileSync(iptvFile, content, 'utf8');
    console.log(`Updated: ${updated}`);
}

main().catch(console.error);
