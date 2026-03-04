/**
 * يحاول جلب الشعارات المفقودة من:
 * 1. iptv-org/logos على GitHub
 * 2. globetv.app بمعرّفات بديلة
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// القنوات المفقودة مع معرفاتها المتوقعة على iptv-org
const MISSING = [
    { name: "A Türk Izmir", ids: ["ATurkIzmir.tr"] },
    { name: "AA Live", ids: ["AALive.tr", "AA.tr"] },
    { name: "Bursa AS TV", ids: ["BursaASTV.tr"] },
    { name: "Bursa AS TV [Geo-blocked]", ids: ["BursaASTV.tr"] },
    { name: "Cekmeköy TV", ids: ["CekmekoyTV.tr", "CekmekoytBelTV.tr"] },
    { name: "Disney Jr. [Geo-blocked]", ids: ["DisneyJr.tr", "DisneyJunior.tr"] },
    { name: "Helwa TV", ids: ["HelwaTV.tr"] },
    { name: "Kent Türk TV", ids: ["KentTurkTV.tr", "KentTurk.tr"] },
    { name: "Minika Cocuk", ids: ["MinikaCocuk.tr", "MinikaÇocuk.tr"] },
    { name: "ON Medya Haber [Geo-blocked]", ids: ["OnMedyaHaber.tr", "OnMedyaTV.tr"] },
    { name: "Power Turk", ids: ["PowerTurk.tr"] },
    { name: "Sat7 Türk", ids: ["Sat7Turk.tr"] },
    { name: "Satranç TV", ids: ["SatranTV.tr", "SatrancTV.tr"] },
    { name: "Teve2", ids: ["Teve2.tr"] },
    { name: "Torba TV", ids: ["TorbaTV.tr"] },
    { name: "Trabzon Buyuksehir Belediyesi TV", ids: ["TrabzonBuyuksehirBelediyesiTV.tr", "TrabzonBuyuksehirTV.tr"] },
    { name: "Trakya Türk TV", ids: ["TrakyaTurkTV.tr", "TrakyaTurk.tr"] },
    { name: "TRT EBA Ortaokul", ids: ["TRTEBAOrtaokul.tr"] },
    { name: "TürkHaber", ids: ["TurkHaber.tr", "TurkHaberTV.tr"] },
    { name: "TV 24", ids: ["TV24.tr"] },
    { name: "ÜÜ TV Üsküdar Üniversitesi TV", ids: ["UUTV1.tr", "UUTVUskudar.tr", "UskudarUniversitesiTelevizyonu1.tr"] },
    { name: "Vizyon 58 TV [Geo-blocked]", ids: ["Vizyon58TV.tr"] },
];

function checkUrl(url) {
    return new Promise((resolve) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
            res.on('data', () => { });
            res.on('end', () => resolve(res.statusCode === 200 ? url : null));
        });
        req.on('error', () => resolve(null));
        req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    });
}

function fetchGlobetvLogo(channelId) {
    return new Promise((resolve) => {
        const url = `https://globetv.app/tr/${channelId}/`;
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const m1 = data.match(/property="og:image"\s+content="([^"]+)"/);
                const m2 = data.match(/content="([^"]+)"\s+property="og:image"/);
                const logo = m1 ? m1[1] : (m2 ? m2[1] : null);
                if (logo && logo.startsWith('http') && !logo.includes('globetv.app')) {
                    resolve(logo);
                } else {
                    resolve(null);
                }
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

        for (const id of ch.ids) {
            // 1. Try iptv-org logos GitHub
            const logoUrl = `https://raw.githubusercontent.com/iptv-org/logos/main/logos/${id}.png`;
            found = await checkUrl(logoUrl);
            if (found) { console.log(`✅ [iptv-org] ${ch.name} -> ${found}`); break; }

            // 2. Try globetv.app
            found = await fetchGlobetvLogo(id);
            if (found) { console.log(`✅ [globetv] ${ch.name} -> ${found}`); break; }

            await delay(200);
        }

        if (!found) {
            console.log(`❌ ${ch.name} - not found`);
        } else {
            results[ch.name] = found;
        }
    }

    console.log(`\nFound ${Object.keys(results).length} logos`);

    if (Object.keys(results).length === 0) return;

    // Update iptv-channels.ts
    const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
    let content = fs.readFileSync(iptvFile, 'utf8');
    let updated = 0;

    for (const [name, logo] of Object.entries(results)) {
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace logo: "" only (not ones already having a URL)
        const rgx = new RegExp(`(name: "${esc}"[^}]+logo: )""`, 'g');
        const newContent = content.replace(rgx, `$1"${logo}"`);
        if (newContent !== content) { updated++; content = newContent; }
    }

    fs.writeFileSync(iptvFile, content, 'utf8');
    console.log(`✅ Updated ${updated} channels in iptv-channels.ts`);
}

main().catch(console.error);
