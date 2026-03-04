import fs from 'fs';
const c = fs.readFileSync('shared/iptv-channels.ts', 'utf8');

// استخراج اسم البلد وقنواته الفارغة
const sections = c.split(/("[\w\s]+":\s*\[)/);
let currentCountry = '';
const results = [];

for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const countryMatch = s.match(/^"([\w\s]+)":\s*\[$/);
    if (countryMatch) {
        currentCountry = countryMatch[1];
    } else if (currentCountry) {
        // Find empty logos in this section
        const emptyRx = /"?name"?:\s*"([^"]+)"[^}]+?"?logo"?:\s*""/g;
        let m;
        while ((m = emptyRx.exec(s)) !== null) {
            results.push({ country: currentCountry, name: m[1] });
        }
    }
}

console.log(`Total empty logos: ${results.length}\n`);
const byCountry = {};
for (const r of results) {
    if (!byCountry[r.country]) byCountry[r.country] = [];
    byCountry[r.country].push(r.name);
}

for (const [country, channels] of Object.entries(byCountry)) {
    console.log(`${country} (${channels.length}):`);
    channels.forEach(n => console.log(`  - ${n}`));
}
