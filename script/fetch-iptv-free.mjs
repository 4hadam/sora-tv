import fs from 'fs/promises';
import { writeFileSync } from 'fs';
import { URL } from 'url';

const startUrl = 'https://www.iptv-free.com/category';
const origin = new URL(startUrl).origin;
const maxPages = 300;
const maxDepth = 2;

const queue = [{ url: startUrl, depth: 0 }];
const seen = new Set();
const found = new Set();

function extractLinks(html, base) {
    const hrefRegex = /href=["']([^"'#>]+)["']/gi;
    const links = [];
    let m;
    while ((m = hrefRegex.exec(html))) {
        try {
            const u = new URL(m[1], base).toString();
            links.push(u);
        } catch (e) {
            // ignore
        }
    }
    return links;
}

function extractStreamLinks(html) {
    const results = [];
    const re = /https?:\/\/[^"'<>\s]+\.m3u8[^"'<>\s]*/gi;
    let m;
    while ((m = re.exec(html))) results.push(m[0]);
    // also .m3u
    const re2 = /https?:\/\/[^"'<>\s]+\.m3u(?!s)[^"'<>\s]*/gi;
    while ((m = re2.exec(html))) results.push(m[0]);
    return results;
}

async function fetchText(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text') || ct.includes('html') || ct.includes('application')) {
            return await res.text();
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function handleM3U(url) {
    const txt = await fetchText(url);
    if (!txt) return;
    const lines = txt.split(/\r?\n/);
    for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        if (t.toLowerCase().startsWith('http')) {
            if (t.includes('.m3u8') || t.includes('.m3u')) found.add(t);
            else found.add(t);
        }
    }
}

(async function main() {
    while (queue.length && seen.size < maxPages) {
        const { url, depth } = queue.shift();
        if (seen.has(url)) continue;
        seen.add(url);
        console.log('Crawling', url);
        const text = await fetchText(url);
        if (!text) continue;

        // extract direct .m3u8/.m3u links
        const streams = extractStreamLinks(text);
        for (const s of streams) found.add(s);

        // if there are .m3u links that are relative, also check anchors
        // enqueue same-origin links
        if (depth < maxDepth) {
            const links = extractLinks(text, url);
            for (const l of links) {
                try {
                    const u = new URL(l);
                    if (u.origin !== origin) continue;
                    if (!seen.has(u.toString())) queue.push({ url: u.toString(), depth: depth + 1 });
                } catch (e) { }
            }
        }
    }

    // For any .m3u links we found, fetch and parse them
    const m3uCandidates = Array.from(found).filter((u) => u.toLowerCase().includes('.m3u'));
    for (const m of m3uCandidates) {
        console.log('Fetching playlist', m);
        await handleM3U(m);
    }

    // final dedupe and write
    const outDir = 'output';
    try { await fs.mkdir(outDir, { recursive: true }); } catch (e) { }
    const outPath = `${outDir}/iptv-free.m3u`;
    const entries = Array.from(found).sort();
    const content = ['#EXTM3U', ...entries].join('\n') + '\n';
    writeFileSync(outPath, content, 'utf8');
    console.log('Wrote', outPath, 'with', entries.length, 'entries');
})();
