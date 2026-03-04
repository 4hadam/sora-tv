import fs from 'fs';
const c = fs.readFileSync('shared/iptv-channels.ts', 'utf8');

// Count countries
const countries = [...c.matchAll(/"([^"]+)":\s*\[/g)].map(m => m[1]).filter(n => !n.includes('http') && n.length > 0);

// Stats
const total = (c.match(/logo:/g) || []).length;
const withLogo = (c.match(/logo: "https/g) || []).length;
const noLogo = (c.match(/logo: ""/g) || []).length;
const wiki = (c.match(/wikimedia\.org/g) || []).length;

console.log(`Countries: ${countries.length}`);
console.log(`Total channels: ${total}`);
console.log(`With logo: ${withLogo}`);
console.log(`Missing logo: ${noLogo}`);
console.log(`Wikipedia URLs: ${wiki}`);

// Show per-country missing
const countryBlocks = c.split(/"([A-Za-z ]+)":\s*\[/);
let results = [];
for (let i = 1; i < countryBlocks.length - 1; i += 2) {
    const name = countryBlocks[i];
    const block = countryBlocks[i + 1];
    const missing = (block.match(/logo: ""/g) || []).length;
    const wikiCount = (block.match(/wikimedia\.org/g) || []).length;
    if (missing > 0 || wikiCount > 0) {
        results.push({ name, missing, wiki: wikiCount });
    }
}
results.sort((a, b) => (b.missing + b.wiki) - (a.missing + a.wiki));
console.log('\nTop countries needing logos:');
results.slice(0, 30).forEach(r => console.log(`  ${r.name}: ${r.missing} missing, ${r.wiki} wikipedia`));
console.log(`\nTotal countries needing work: ${results.length}`);
