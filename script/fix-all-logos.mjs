/**
 * تحديث شعارات جميع دول العالم
 * المصادر بالترتيب:
 * 1. https://raw.githubusercontent.com/iptv-org/logos/main/logos/{channelId}.png
 *
 * يعالج:
 * - logo: "" (فراغ)
 * - logo: "https://...wikimedia.org..." (قد تكون معطوبة)
 *
 * يتطلب: output/iptv-org-channels-cache.json (name→id database)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE_FILE = path.join(ROOT, 'output', 'iptv-org-channels-cache.json');
const LOGO_CACHE = path.join(ROOT, 'output', 'logo-check-cache.json');
const CONCURRENCY = 20;

// ============================================================
// Helpers
// ============================================================
function normalize(name) {
    return name.toLowerCase()
        .replace(/\[.*?\]/g, '')
        .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[üûùú]/g, 'u')
        .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ç]/g, 'c')
        .replace(/[ğ]/g, 'g').replace(/[ş]/g, 's').replace(/[ı]/g, 'i')
        .replace(/[ñ]/g, 'n').replace(/[ß]/g, 'ss')
        .replace(/[^a-z0-9 ]/gi, '')
        .replace(/\s+/g, ' ').trim();
}

function checkLogoUrl(url) {
    return new Promise(resolve => {
        try {
            const req = https.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 8000
            }, res => {
                res.resume();
                resolve(res.statusCode < 400 ? url : null);
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        } catch { resolve(null); }
    });
}

async function batchRun(items, fn, concurrency = CONCURRENCY) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const r = await Promise.all(batch.map(fn));
        results.push(...r);
        process.stdout.write(`\r  Checking: ${Math.min(i + concurrency, items.length)}/${items.length}   `);
    }
    console.log();
    return results;
}

function isWikiUrl(url) {
    return url && (url.includes('wikimedia.org') || url.includes('wikipedia.org'));
}

// ============================================================
// Build name → channelId map
// ============================================================
function buildNameToId(channels) {
    const map = new Map();
    for (const ch of channels) {
        const keys = new Set([
            ch.name,
            normalize(ch.name),
            normalize(ch.name).replace(/ tv$/, ''),
            normalize(ch.name) + ' tv',
            normalize(ch.name).replace(/^tv /, ''),
            normalize(ch.name).replace(/ channel$/, ''),
        ]);
        if (ch.alt_names) {
            for (const alt of ch.alt_names) {
                keys.add(alt);
                keys.add(normalize(alt));
            }
        }
        for (const key of keys) {
            if (key && !map.has(key)) map.set(key, ch.id);
        }
    }
    return map;
}

function findId(name, map) {
    const norm = normalize(name);
    return (
        map.get(name) ||
        map.get(norm) ||
        map.get(norm.replace(/ tv$/, '')) ||
        map.get(norm + ' tv') ||
        map.get(norm.replace(/^tv /, '')) ||
        map.get(norm.replace(/ channel$/, '')) ||
        null
    );
}

// ============================================================
// Main
// ============================================================
async function main() {
    // 1. قراءة قاعدة iptv-org
    console.log('📂 Loading iptv-org channel database...');
    const iptvOrg = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const nameToId = buildNameToId(iptvOrg);
    console.log(`   ${iptvOrg.length} channels, ${nameToId.size} name keys`);

    // 2. قراءة iptv-channels.ts
    const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
    let content = fs.readFileSync(iptvFile, 'utf8');

    // 3. جمع القنوات التي تحتاج تحديثاً (مزيل التكرار)
    // يدعم كلا الصيغتين: name: "..." (تركيا) و "name": "..." (باقي الدول)
    const channelRx = /"?name"?:\s*"([^"]+)"[^}]+?"?logo"?:\s*"([^"]*)"/g;
    const seen = new Set();
    const toUpdate = []; let m; while ((m = channelRx.exec(content)) !== null) {
        const name = m[1];
        const logo = m[2];
        if (!seen.has(name) && (logo === '' || isWikiUrl(logo))) {
            seen.add(name);
            toUpdate.push({ name, currentLogo: logo });
        }
    }

    const emptyCount = toUpdate.filter(c => c.currentLogo === '').length;
    const wikiCount = toUpdate.filter(c => isWikiUrl(c.currentLogo)).length;
    console.log(`\n🔍 Channels needing update: ${toUpdate.length}`);
    console.log(`   Empty logo: ${emptyCount}`);
    console.log(`   Wikipedia:  ${wikiCount}\n`);

    // 4. تحميل cache السابق
    let logoCache = fs.existsSync(LOGO_CACHE)
        ? JSON.parse(fs.readFileSync(LOGO_CACHE, 'utf8'))
        : {};

    // القنوات التي لم تُفحص بعد
    const unchecked = toUpdate.filter(ch => !(ch.name in logoCache));
    console.log(`ℹ️  Cached: ${toUpdate.length - unchecked.length} | To check: ${unchecked.length}`);

    if (unchecked.length > 0) {
        console.log('🌐 Checking iptv-org logos...');
        const results = await batchRun(unchecked, async (ch) => {
            const id = findId(ch.name, nameToId);
            if (!id) return { name: ch.name, logo: null, reason: 'no-id' };

            // جرب .png ثم .jpg
            for (const ext of ['png', 'jpg', 'svg']) {
                const url = `https://raw.githubusercontent.com/iptv-org/logos/main/logos/${id}.${ext}`;
                const ok = await checkLogoUrl(url);
                if (ok) return { name: ch.name, logo: ok, id, source: `iptv-org.${ext}` };
            }
            return { name: ch.name, logo: null, id, reason: 'no-logo-file' };
        });

        for (const r of results) {
            logoCache[r.name] = r;
        }
        fs.writeFileSync(LOGO_CACHE, JSON.stringify(logoCache, null, 2));
    }

    // 5. تطبيق التحديثات
    console.log('\n✏️  Applying updates...');
    let updated = 0;
    let skipped = 0;

    for (const ch of toUpdate) {
        const cached = logoCache[ch.name];
        if (!cached?.logo) { skipped++; continue; }

        const esc = ch.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // يدعم كلا الصيغتين: name: و "name":
        const pat = new RegExp(`("?name"?:\\s*"${esc}"[^}]+?"?logo"?:\\s*)"[^"]*"`, 'g');
        const prev = content;
        content = content.replace(pat, `$1"${cached.logo}"`);
        if (content !== prev) {
            updated++;
            console.log(`  ✅ ${ch.name}`);
        }
    }

    fs.writeFileSync(iptvFile, content, 'utf8');

    // 6. إحصاء نهائي
    const finalWith = (content.match(/"?logo"?:\s*"https/g) || []).length;
    const finalNo = (content.match(/"?logo"?:\s*""/g) || []).length;
    const finalWiki = (content.match(/wikimedia\.org/g) || []).length;

    console.log(`\n📊 === FINAL STATS ===`);
    console.log(`   ✅ Updated:        ${updated}`);
    console.log(`   ⏭️  Skipped:        ${skipped} (no logo in iptv-org)`);
    console.log(`   🖼️  With logo:      ${finalWith}`);
    console.log(`   ❌ Missing:        ${finalNo}`);
    console.log(`   🔗 Wikipedia left: ${finalWiki}`);

    // قائمة القنوات بدون شعار (لمعرفة ما تبقى)
    const noLogoList = toUpdate.filter(ch => !logoCache[ch.name]?.logo);
    if (noLogoList.length > 0 && noLogoList.length <= 50) {
        console.log(`\n⚠️  Still no logo (${noLogoList.length}):`);
        noLogoList.forEach(ch => console.log(`   - ${ch.name}  [${logoCache[ch.name]?.reason || '?'}]`));
    } else if (noLogoList.length > 50) {
        console.log(`\n⚠️  Still no logo for ${noLogoList.length} channels`);
    }
}

main().catch(console.error);
