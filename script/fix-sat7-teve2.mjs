import fs from 'fs';
let c = fs.readFileSync('shared/iptv-channels.ts', 'utf8');

c = c.replace(/name: "Sat7 Türk"([^}]+)logo: "https:\/\/i\.imgur\.com\/sat7turk\.png"/g,
    'name: "Sat7 Türk"$1logo: ""');

c = c.replace(/name: "Teve2"([^}]+)logo: "https:\/\/www\.teve2\.com\.tr[^"]*"/g,
    'name: "Teve2"$1logo: ""');

fs.writeFileSync('shared/iptv-channels.ts', c, 'utf8');

const block = c.slice(c.indexOf('"Turkey": ['), c.indexOf('"Ukraine":'));
console.log(`Turkey: ${(block.match(/logo: "https/g) || []).length} with logo | ${(block.match(/logo: ""/g) || []).length} missing`);
