import fs from 'fs';

const f = 'shared/iptv-channels.ts';
let c = fs.readFileSync(f, 'utf8');

// 1. إزالة حقل quality من كل المدخلات
const qualityMatches = c.match(/,\s*\n\s*"quality":\s*"[^"]*"/g) || [];
c = c.replace(/,\s*\n\s*"quality":\s*"[^"]*"/g, '');
console.log('quality fields removed:', qualityMatches.length);

// 2. إزالة حقل country من كل المدخلات
const countryMatches = c.match(/,\s*\n\s*"country":\s*"[^"]*"/g) || [];
c = c.replace(/,\s*\n\s*"country":\s*"[^"]*"/g, '');
console.log('country fields removed:', countryMatches.length);

// 3. إصلاح الفواصل الزائدة قبل ] مباشرة (trailing commas)
const trailingMatches = c.match(/,(\s*\n\s*\])/g) || [];
c = c.replace(/,(\s*\n\s*\])/g, '$1');
console.log('trailing commas fixed:', trailingMatches.length);

fs.writeFileSync(f, c, 'utf8');
console.log('\n✅ Done!');
