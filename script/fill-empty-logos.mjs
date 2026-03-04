/**
 * محاولة أخيرة لإيجاد شعارات الـ 14 قناة تركية الفارغة
 */
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MISSING = [
    {
        name: "A Türk Izmir",
        globetvIds: ["ATurkIzmir.tr", "ATurk.tr"],
        direct: []
    },
    {
        name: "AA Live",
        globetvIds: ["AALive.tr", "AnadoluAgency.tr"],
        direct: ["https://cdnuploads.aa.com.tr/uploads/Contents/2024/01/15/thumbs_b_c_a8568d8291c6e7cfa6b2ac9d1e2a3456.jpg"]
    },
    {
        name: "Bursa AS TV",
        globetvIds: ["BursaASTV.tr", "BASTV.tr", "BursaAS.tr"],
        direct: []
    },
    {
        name: "Bursa AS TV [Geo-blocked]",
        globetvIds: ["BursaASTV.tr", "BASTV.tr"],
        direct: []
    },
    {
        name: "Helwa TV",
        globetvIds: ["HelwaTV.tr"],
        direct: []
    },
    {
        name: "Power Turk",
        globetvIds: ["PowerTurk.tr", "PowerTurkTV.tr"],
        direct: []
    },
    {
        name: "Sat7 Türk",
        globetvIds: ["Sat7Turk.tr", "SAT7Turk.tr"],
        direct: [
            "https://i.imgur.com/sat7turk.png",
        ]
    },
    {
        name: "Satranç TV",
        globetvIds: ["SatranTV.tr", "SatrancTV.tr", "Satranc.tr"],
        direct: []
    },
    {
        name: "Teve2",
        globetvIds: ["Teve2.tr", "TEVE2.tr"],
        direct: [
            "https://www.teve2.com.tr/Data/EditorFiles/FileManager/teveLogo.png",
        ]
    },
    {
        name: "Torba TV",
        globetvIds: ["TorbaTV.tr", "Torba.tr"],
        direct: []
    },
    {
        name: "TRT EBA Ortaokul",
        globetvIds: ["TRTEBAOrtaokul.tr", "TRTEBA.tr"],
        direct: []
    },
    {
        name: "TV 24",
        globetvIds: ["TV24.tr", "Tv24TR.tr"],
        direct: [
            "https://www.tv24.com.tr/Images/TV24Logo.png",
        ]
    },
];

function fetchDirect(url) {
    return new Promise(resolve => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
            res.resume();
            resolve(res.statusCode < 400 ? url : null);
        });
        req.on('error', () => resolve(null));
        req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    });
}

function fetchGlobetvOg(channelId) {
    return new Promise(resolve => {
        const url = `https://globetv.app/tr/${channelId}/`;
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const m = data.match(/property="og:image"\s+content="([^"]+)"/) ||
                    data.match(/content="([^"]+)"\s+property="og:image"/);
                const logo = m ? m[1] : null;
                resolve(logo && logo.startsWith('http') && !logo.includes('globetv.app') ? logo : null);
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    });
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const results = {};

    for (const ch of MISSING) {
        let found = null;

        for (const id of ch.globetvIds) {
            const logo = await fetchGlobetvOg(id);
            if (logo) { found = logo; console.log(`✅ globetv(${id}) ${ch.name} -> ${logo}`); break; }
            await delay(200);
        }

        if (!found) {
            for (const url of ch.direct) {
                const ok = await fetchDirect(url);
                if (ok) { found = ok; console.log(`✅ direct ${ch.name} -> ${url}`); break; }
                await delay(100);
            }
        }

        if (!found) console.log(`❌ ${ch.name}`);
        else results[ch.name] = found;
    }

    console.log(`\nFound: ${Object.keys(results).length}/${MISSING.length}`);
    if (Object.keys(results).length === 0) { console.log('Nothing to update.'); return; }

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
    console.log(`✅ Updated ${updated}`);

    const block = content.slice(content.indexOf('"Turkey": ['), content.indexOf('"Ukraine":'));
    console.log(`Turkey: ${(block.match(/logo: "https/g) || []).length} with logo | ${(block.match(/logo: ""/g) || []).length} missing`);
}

main().catch(console.error);
