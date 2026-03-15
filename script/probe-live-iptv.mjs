import fs from 'fs';

(async () => {
    const base = 'https://live.iptv-free.com';
    const paths = ['/list.m3u', '/playlist.m3u', '/iptv.m3u', '/channels.m3u', '/m3u', '/m3u.txt', '/all.m3u', '/playlist.txt', '/free.m3u', '/index.m3u', '/channels.m3u.txt', '/directory.m3u', '/list.txt', '/all.txt', '/index.txt'];
    for (const p of paths) {
        try {
            const r = await fetch(base + p, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const t = await r.text();
            if (r.ok && (t.includes('#EXTM3U') || /https?:\/\//.test(t))) {
                console.log('FOUND', p, 'len', t.length);
                fs.writeFileSync('output/found-' + p.replace(/[^a-z0-9]/gi, '_') + '.txt', t);
                return;
            } else {
                console.log('no', p, r.status);
            }
        } catch (e) {
            console.log('err', p, e.message);
        }
    }
    console.log('done');
})();
