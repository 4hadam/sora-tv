import { readFileSync } from 'fs';
const content = readFileSync('shared/iptv-channels.ts', 'utf8');
const cats = {};
const re = /"category":\s*"([^"]+)"/g;
let m;
while ((m = re.exec(content)) !== null) {
    cats[m[1]] = (cats[m[1]] || 0) + 1;
}
Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, v]) => console.log(v, JSON.stringify(k)));
