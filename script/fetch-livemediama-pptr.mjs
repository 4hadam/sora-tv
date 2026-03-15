import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const START_URL = 'https://livemediama.com/fr/';
const OUT_DIR = path.resolve(process.cwd(), 'output');
const OUT_FILE = path.join(OUT_DIR, 'livemediama.m3u');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    await fs.promises.mkdir(OUT_DIR, { recursive: true });
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; Scraper/1.0)');
    await page.setViewport({ width: 1200, height: 900 });

    const found = new Set();

    // capture responses that contain m3u or m3u8
    page.on('response', async (res) => {
        try {
            const url = res.url();
            if (!url) return;
            if (/\.m3u8?/i.test(url)) found.add(url);
            const headers = res.headers();
            const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
            if (ct.includes('json') || ct.includes('text') || ct.includes('application')) {
                const txt = await res.text().catch(() => null);
                if (!txt) return;
                const re = /https?:\/\/[^\s"'<>]+\.(m3u8|m3u)(?:\?[^\s"'<>]*)?/gi;
                let m;
                while ((m = re.exec(txt))) found.add(m[0]);
            }
        } catch (e) {
            // ignore
        }
    });

    console.log('Opening', START_URL);
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => { });
    await sleep(1500);

    // scan DOM for links
    const domLinks = await page.evaluate(() => {
        const out = new Set();
        const walker = document.querySelectorAll('a,iframe,video,source,div,span');
        const re = /https?:\/\/[^\s"'<>]+\.(m3u8|m3u)(?:\?[^\s"'<>]*)?/gi;
        walker.forEach((el) => {
            try {
                const attrs = [el.href, el.src, el.getAttribute && el.getAttribute('data-src'), el.getAttribute && el.getAttribute('data-href'), el.innerText].filter(Boolean);
                for (const a of attrs) {
                    if (typeof a !== 'string') continue;
                    let m;
                    while ((m = re.exec(a))) out.add(m[0]);
                }
            } catch (e) { }
        });
        return Array.from(out);
    });
    domLinks.forEach(u => found.add(u));

    // attempt to click play/watch buttons to trigger XHRs
    const candidates = await page.$$eval('a,button,[role="button"]', els => els.map(e => ({ text: (e.innerText || e.textContent || '').trim().toLowerCase(), selector: '' })));
    // we'll try clicking elements whose text suggests playing/viewing
    const playKeywords = ['play', 'voir', 'regarder', 'watch', 'live', 'stream', 'play video'];

    const elements = await page.$$('a,button,[role="button"]');
    for (const el of elements) {
        try {
            const txt = (await el.evaluate(e => (e.innerText || e.textContent || '').trim().toLowerCase()));
            if (!txt) continue;
            if (playKeywords.some(k => txt.includes(k))) {
                console.log('Clicking element with text:', txt.slice(0, 60));
                await el.evaluate(e => e.scrollIntoView({ block: 'center' }));
                await el.click().catch(() => { });
                await sleep(1200);
            }
        } catch (e) { }
    }

    // give time for network
    await sleep(2000);

    // final DOM scan after interactions
    const domLinks2 = await page.evaluate(() => {
        const out = new Set();
        const re = /https?:\/\/[^\s"'<>]+\.(m3u8|m3u)(?:\?[^\s"'<>]*)?/gi;
        const text = document.documentElement.innerHTML;
        let m;
        while ((m = re.exec(text))) out.add(m[0]);
        return Array.from(out);
    });
    domLinks2.forEach(u => found.add(u));

    await browser.close();

    const arr = Array.from(found).sort();
    if (arr.length === 0) console.log('No m3u/m3u8 links found.');
    else {
        const content = ['#EXTM3U', ...arr].join('\n') + '\n';
        fs.writeFileSync(OUT_FILE, content, 'utf8');
        console.log('Wrote', OUT_FILE, 'with', arr.length, 'entries');
    }
})();
