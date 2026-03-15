import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const START_URL = 'https://www.iptv-free.com/category';
const OUT_DIR = path.resolve(process.cwd(), 'output', 'iptv-free-by-category');

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

(async () => {
    await fs.promises.mkdir(OUT_DIR, { recursive: true });
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; Scraper/1.0)');
    await page.setViewport({ width: 1200, height: 900 });

    // collect responses globally (we'll snapshot ranges per click)
    const recent = [];
    page.on('response', async res => {
        try {
            const url = res.url();
            if (!url) return;
            // record direct playlist urls
            if (/\.m3u8?|playlist/i.test(url)) {
                recent.push({ url });
                return;
            }
            const h = (res.headers && (res.headers()['content-type'] || res.headers()['Content-Type'])) || '';
            if (h && /application\/json|text\//i.test(h)) {
                const txt = await res.text().catch(() => null);
                if (!txt) return;
                const matches = Array.from(txt.matchAll(/https?:\/\/[^\s"'<>]+\.(m3u8|m3u)[^\s"'<>]*/gi)).map(m => m[0]);
                for (const m of matches) recent.push({ url: m });
            }
        } catch (e) { /* ignore */ }
    });

    console.log('Opening category page...');
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    // wait for table rows to render
    await page.waitForSelector('table tbody tr', { timeout: 30000 });

    const rows = await page.$$('table tbody tr');
    console.log('Found', rows.length, 'rows');

    const summary = [];

    for (let i = 0; i < rows.length; i++) {
        try {
            const row = rows[i];
            // get category name
            const name = await row.$eval('td:nth-child(2)', el => el.innerText.trim()).catch(() => `category-${i}`);
            console.log(`Processing [${i + 1}/${rows.length}] ${name}`);

            // find Preview button (or link) inside this row by text
            let btn = await row.$('button');
            if (!btn) {
                const elems = await row.$$('button, a, [role="button"], div, span');
                for (const el of elems) {
                    const txt = (await el.evaluate(e => (e.innerText || e.textContent || '').trim())).toLowerCase();
                    if (txt.includes('preview')) { btn = el; break; }
                }
            }
            if (!btn) { console.log('  no preview button, skipping'); continue; }

            const before = recent.length;

            // scroll into view and click (some rows may be offscreen)
            try { await btn.evaluate(b => b.scrollIntoView({ block: 'center' })); } catch (e) { }
            // click and wait a bit for network activity
            await btn.click({ delay: 50 }).catch(() => { });
            await sleep(2500);

            // also attempt to extract links from any shown dialog/modal
            const inPageLinks = await page.evaluate(() => {
                const found = new Set();
                const modal = document.querySelector('[role="dialog"]') || document.querySelector('.modal') || document.body;
                modal.querySelectorAll('a,iframe,video,source,div').forEach(el => {
                    try {
                        const src = el.src || el.getAttribute && (el.getAttribute('src') || el.getAttribute('data-src')) || el.href || el.innerText;
                        if (src && /https?:\/\/.+\.(m3u8|m3u)/i.test(src)) found.add(src.trim());
                        // sometimes URLs are embedded in text
                        if (src && typeof src === 'string') {
                            const m = Array.from(src.matchAll(/https?:\/\/[^\s"'<>]+\.(m3u8|m3u)[^\s"'<>]*/gi)).map(x => x[0]);
                            m.forEach(x => found.add(x));
                        }
                    } catch (e) { }
                });
                return Array.from(found);
            });

            const after = recent.length;
            const newResponses = recent.slice(before, after).map(r => r.url);
            const allFound = Array.from(new Set([...inPageLinks, ...newResponses]));

            // if none found, wait a bit longer and try again
            if (allFound.length === 0) {
                await sleep(2000);
                const after2 = recent.length;
                const more = recent.slice(after, after2).map(r => r.url);
                more.forEach(u => allFound.push(u));
            }

            // save file for category
            const slug = slugify(name || `category-${i}`);
            const outFile = path.join(OUT_DIR, `${slug}.m3u`);
            const lines = ['#EXTM3U'];
            for (const u of allFound) lines.push(u);
            if (lines.length === 1) {
                // write empty file as placeholder
                lines.push(`# no m3u found for ${name}`);
            }
            fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
            console.log('  wrote', outFile, '->', allFound.length, 'links');

            summary.push({ name, file: outFile, count: allFound.length, links: allFound });

            // try to close modal if present (press Escape)
            await page.keyboard.press('Escape').catch(() => { });
            await sleep(300);
        } catch (e) { console.log('Error processing row', i, e.message); }
    }

    // write summary
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log('Done. Files saved in', OUT_DIR);
    await browser.close();
})();
