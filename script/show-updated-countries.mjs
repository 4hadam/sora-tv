import { readFileSync } from 'fs';

const log = readFileSync('script/url-update-log.txt', 'utf8');
const channelsTs = readFileSync('shared/iptv-channels.ts', 'utf8');

// Extract updated channel names from log
const updatedNames = new Set();
for (const line of log.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('===') && !trimmed.startsWith('Total') && !trimmed.startsWith('OLD:') && !trimmed.startsWith('NEW:')) {
        updatedNames.add(trimmed);
    }
}

// Map channel names to countries
const tsLines = channelsTs.split('\n');
const countryCount = {};
let currentCountry = '';

for (const line of tsLines) {
    const countryMatch = line.match(/^\s+"([^"]+)":\s*\[/);
    if (countryMatch) currentCountry = countryMatch[1];

    const nameMatch = line.match(/"name":\s*"([^"]+)"/);
    if (nameMatch && currentCountry) {
        if (updatedNames.has(nameMatch[1].trim())) {
            countryCount[currentCountry] = (countryCount[currentCountry] || 0) + 1;
        }
    }
}

const sorted = Object.entries(countryCount).sort((a, b) => b[1] - a[1]);

console.log(`\nالدول التي جُدِّدت روابطها (${sorted.length} دولة):\n`);
sorted.forEach(([country, count]) => {
    const bar = '█'.repeat(Math.ceil(count / 5));
    console.log(`  ${String(count).padStart(4)}  ${country.padEnd(35)} ${bar}`);
});
console.log(`\nالمجموع: ${sorted.reduce((s, [, c]) => s + c, 0)} قناة في ${sorted.length} دولة`);
