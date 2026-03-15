import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const START_URL = 'https://livemediama.com/fr/';
const OUT_DIR = path.resolve(process.cwd(), 'output', 'livemediama-channels');
const AGG_FILE = path.resolve(process.cwd(), 'output', 'livemediama-all.m3u');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

(async () => {
    await fs.promises.mkdir(OUT_DIR, { recursive: true });

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; Scraper/1.0)');
    await page.setViewport({ width: 1200, height: 900 });

    const foundGlobal = new Set();

    // response listener to capture playlists and embedded urls
    page.on('response', async res => {
        try {
            const url = res.url();
            if (!url) return;
            if (/\.(m3u8|m3u)(\?|$)/i.test(url)) foundGlobal.add(url);
            const headers = res.headers();
            const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
            if (ct.includes('json') || ct.includes('text') || ct.includes('application')) {
                const txt = await res.text().catch(() => null);
                if (!txt) return;
                const re = /https?:\/\/[^\s"'<>]+\.(m3u8|m3u)(?:\?[^\s"'<>]*)?/gi;
                let m;
                while ((m = re.exec(txt))) foundGlobal.add(m[0]);
            }
        } catch (e) { }
    });

    console.log('Opening index', START_URL);
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => { });
    await sleep(1000);

    // collect candidate channel links from the page, excluding obvious non-channel paths
    const links = await page.evaluate(() => {
        const out = new Set();
        const origin = location.origin;
        const blacklist = ['partenaires', 'contact', 'mentions', 'politique', 'about', 'rss', 'privacy', 'terms', 'login', 'register', 'subscribe'];
        document.querySelectorAll('a[href]').forEach(a => {
            try {
                const href = a.href;
                if (!href) return;
                const u = new URL(href, location.href);
                if (u.origin !== origin) return;
                const m = u.pathname.match(/^\/fr\/(.+)$/);
                if (!m) return;
                const rest = m[1].replace(/\/$/, '');
                const segs = rest.split('/');
                if (segs.length > 2) return;
                if (blacklist.some(b => segs.join('/').toLowerCase().includes(b))) return;
                if (u.pathname.endsWith('.jpg') || u.pathname.endsWith('.png') || u.pathname.endsWith('.css') || u.pathname.endsWith('.js')) return;
                out.add(u.toString());
            } catch (e) { }
        });
        return Array.from(out).sort();
    });

    console.log('Found', links.length, 'candidate channel URLs');

    const visited = new Set();
    const summary = [];

    for (const url of links) {
        if (visited.has(url)) continue;
        visited.add(url);
        try {
            console.log('Visiting', url);
            const channelPage = await browser.newPage();
            await channelPage.setUserAgent('Mozilla/5.0 (compatible; Scraper/1.0)');
            channelPage.setViewport({ width: 1200, height: 900 });

            const foundLocal = new Set();
            // local listener
            channelPage.on('response', async res => {
                try {
                    const u = res.url();
                    if (!u) return;
                    if (/\.(m3u8|m3u)(\?|$)/i.test(u)) foundLocal.add(u);
                    const headers = res.headers();
                    const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
                    if (ct.includes('json') || ct.includes('text') || ct.includes('application')) {
                        const txt = await res.text().catch(() => null);
                        if (!txt) return;
                        const re = /https?:\/\/[^\s"'<>]+\.(m3u8|m3u)(?:\?[^\s"'<>]*)?/gi;
                        let m;
                        while ((m = re.exec(txt))) foundLocal.add(m[0]);
                    }
                } catch (e) { }
            });

            await channelPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => { });
            await sleep(1000);

            // try clicking play/watch buttons to trigger requests
            const els = await channelPage.$$('a,button,[role="button"]');
            for (const el of els) {
                try {
                    const txt = (await el.evaluate(e => (e.innerText || e.textContent || '').trim().toLowerCase()));
                    if (!txt) continue;
                    if (['play', 'voir', 'regarder', 'watch', 'live', 'stream', 'play video', 'lire'].some(k => txt.includes(k))) {
                        await el.evaluate(e => e.scrollIntoView({ block: 'center' }));
                        await el.click().catch(() => { });
                        await sleep(800);
                    }
                } catch (e) { }
            }

            // scan DOM for embedded URLs
            const domUrls = await channelPage.evaluate(() => {
                const out = new Set();
                const re = /https?:\/\/[^\s"'<>]+\.(m3u8|m3u)(?:\?[^\s"'<>]*)?/gi;
                const html = document.documentElement.innerHTML;
                let m;
                while ((m = re.exec(html))) out.add(m[0]);
                return Array.from(out);
            });
            domUrls.forEach(u => foundLocal.add(u));

            // merge local into global
            foundLocal.forEach(u => foundGlobal.add(u));

            // write per-channel file
            const channelName = url.split('/').filter(Boolean).slice(1).join('-') || 'channel';
            const slug = slugify(channelName);
            const outFile = path.join(OUT_DIR, `${slug}.m3u`);
            const arr = Array.from(foundLocal).sort();
            const content = ['#EXTM3U', ...arr].join('\n') + '\n';
            fs.writeFileSync(outFile, content, 'utf8');
            console.log('  saved', outFile, arr.length, 'links');
            summary.push({ url, file: outFile, count: arr.length });

            await channelPage.close();
            await sleep(500);
        } catch (e) { console.log('visit error', url, e.message); }
    }

    // write aggregated file
    const all = Array.from(foundGlobal).sort();
    fs.writeFileSync(AGG_FILE, ['#EXTM3U', ...all].join('\n') + '\n', 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

    console.log('Done. Aggregated', all.length, 'unique links to', AGG_FILE);
    await browser.close();
})();
