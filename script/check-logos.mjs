import fs from 'fs';

const content = fs.readFileSync('shared/iptv-channels.ts', 'utf8');
const total = (content.match(/"url":/g) || []).length;
const withLogo = (content.match(/"logo":/g) || []).length;
const noLogo = total - withLogo;

console.log(`Total channels:   ${total}`);
console.log(`With logo:        ${withLogo} (${Math.round(withLogo / total * 100)}%)`);
console.log(`Without logo:     ${noLogo} (${Math.round(noLogo / total * 100)}%)`);
