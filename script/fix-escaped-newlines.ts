import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, '../shared/iptv-channels.ts');
const raw = fs.readFileSync(filePath, 'utf8');

if (!raw.includes('\\n')) {
    console.log('No escaped newlines found.');
    process.exit(0);
}

const fixed = raw.replace(/\\n/g, '\n');
const backup = filePath + '.pre-fix.bak';
fs.copyFileSync(filePath, backup);
fs.writeFileSync(filePath, fixed, 'utf8');
console.log(`Rewrote ${filePath} (backup at ${backup})`);
