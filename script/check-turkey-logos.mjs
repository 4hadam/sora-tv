import { readFileSync } from 'fs';
const c = readFileSync('shared/iptv-channels.ts', 'utf8');
const start = c.indexOf('"Turkey": [');
const end = c.indexOf('"Ukraine":', start);
const block = c.slice(start, end);
const withLogo = (block.match(/logo: "https/g) || []).length;
const noLogo = (block.match(/logo: ""/g) || []).length;
console.log('Turkey - With logo:', withLogo, '| Missing:', noLogo, '| Total:', withLogo + noLogo);

// List channels with no logo
const noLogoChannels = [...block.matchAll(/name: "([^"]+)"[^}]+logo: ""/g)].map(m => m[1]);
if (noLogoChannels.length > 0) {
    console.log('\nChannels without logo:');
    noLogoChannels.forEach(name => console.log(' -', name));
}
