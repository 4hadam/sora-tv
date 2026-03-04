import fs from 'fs';
import https from 'https';

async function main() {

    const c = fs.readFileSync('shared/iptv-channels.ts', 'utf8');

    // جمع روابط Wikipedia من جميع الدول (غير تركيا) مباشرة من الملف
    const turkeyStart = c.indexOf('"Turkey": [');
    const turkeyEnd = c.indexOf('"Ukraine":', turkeyStart);
    const beforeTurkey = c.slice(0, turkeyStart);
    const afterTurkey = c.slice(turkeyEnd);
    const nonTurkeyContent = beforeTurkey + afterTurkey;

    const wikiRx = /"logo":\s*"(https?:\/\/[^"]*(?:wikimedia|wikipedia)[^"]+)"/g;
    const allWiki = [...nonTurkeyContent.matchAll(wikiRx)].map(x => x[1]);
    const unique = [...new Set(allWiki)];

    const sample = unique.slice(0, 20);
    console.log(`Total Wikipedia URLs (non-Turkey): ${unique.length}`);
    console.log(`Testing sample of ${sample.length}...\n`);

    function checkUrl(url) {
        return new Promise(resolve => {
            const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
                res.resume();
                resolve({ url, status: res.statusCode, ok: res.statusCode < 400 });
            });
            req.on('error', () => resolve({ url, status: 'ERR', ok: false }));
            req.setTimeout(8000, () => { req.destroy(); resolve({ url, status: 'TIMEOUT', ok: false }); });
        });
    }

    const results = await Promise.all(sample.map(checkUrl));
    const working = results.filter(r => r.ok);
    const broken = results.filter(r => !r.ok);

    console.log(`✅ Working: ${working.length}/${sample.length}`);
    console.log(`❌ Broken: ${broken.length}/${sample.length}`);
    console.log('\nBroken:');
    broken.forEach(r => console.log(`  ${r.status} ${r.url.substring(0, 90)}`));
    console.log('\nWorking examples:');
    working.slice(0, 5).forEach(r => console.log(`  ✅ ${r.url.substring(0, 90)}`));
}

main().catch(console.error);
