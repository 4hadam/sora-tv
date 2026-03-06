/**
 * جلب شعارات قنوات تركيا من globetv.app (og:image) وتحديثها في iptv-channels.ts
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// القنوات المفقودة (بدون شعار حاليًا)
const MISSING = [
    "4U TV", "A Türk Izmir", "AA Live", "Afroturk TV", "Aksu TV",
    "Alanya Posta TV", "Almahriah TV", "Altas TV", "Al-Zahra TV Turkic",
    "Anadolu Net TV", "ARAS TV", "Berat TV", "Bizimev TV",
    "BRTV [Geo-blocked]", "Bursa AS TV", "Bursa AS TV [Geo-blocked]",
    "Can TV", "Cay TV", "Cekmeköy TV", "Çiftçi TV",
    "Deha TV [Geo-blocked]", "Deniz Postası TV", "DİM TV [Geo-blocked]",
    "Diyar TV", "Dost TV", "Edessa TV", "Er TV [Geo-blocked]",
    "Erzurum Web TV", "ES TV", "ETV Kayseri", "ETV Manisa",
    "Finans Turk TV", "Fortuna TV", "FX [Geo-blocked]",
    "Guneydogu TV", "Haber61 TV", "Helwa TV",
    "Hunat TV", "Hunat TV [Geo-blocked]",
    "Icel TV", "Kanal 12", "Kanal 15", "Kanal 23", "Kanal 26",
    "Kanal 3", "Kanal 32", "Kanal 33", "Kanal 38", "KANAL 58",
    "Kanal 68", "Kanal Avrupa", "Kanal Firat", "Kanal Hayat",
    "Kanal V", "Kanal Z [Geo-blocked]", "Kay TV [Geo-blocked]",
    "Kent Türk TV", "Konya Olay TV", "Kudüs TV [Geo-blocked]",
    "Life TV", "Line TV", "MaviKaradeniz", "Med Muzik",
    "Mekameleen TV", "Mercan TV", "Milyon TV", "MovieSmart Turk",
    "MTürk TV", "Natural TV", "Olay Türk TV Kayseri [Geo-blocked]",
    "On 6", "ON Medya Haber [Geo-blocked]", "On4 TV", "Öncü TV",
    "Qaf TV", "Satranç TV", "Sports TV [Geo-blocked]",
    "Sun RTV", "Tabii Spor 6 [Geo-blocked]", "Tarih TV",
    "Tatlises TV", "Tempo TV", "Tivi 6", "TMB", "Ton TV",
    "Toprak TV", "Torba TV", "Trabzon Buyuksehir Belediyesi TV",
    "Trakya Türk TV", "TürkHaber", "TV 1", "TV 24", "TV 264",
    "TV 41", "TV 52", "TV Den", "TYT Turk", "Üniversite TV",
    "Urfa Natik TV", "ÜÜ TV Üsküdar Üniversitesi TV", "V TV",
    "Vav TV", "Vizyon 58 TV [Geo-blocked]", "Woman TV"
];

// خريطة اسم القناة -> channelId (من iptv-org)
const NAME_TO_ID = {
    "4U TV": "4UTV.tr",
    "Aksu TV": "AksuTV.tr",
    "Afroturk TV": "AfroturkTV.tr",
    "Alanya Posta TV": "AlanyaPostaTV.tr",
    "Almahriah TV": "AlmahriahTV.tr",
    "Altas TV": "AltasTV.tr",
    "Anadolu Net TV": "AnadoluNetTV.tr",
    "Berat TV": "BeratTV.tr",
    "Bizimev TV": "BizimevTV.tr",
    "Bursa AS TV": "BursaASTV.tr",
    "Can TV": "CanTV.tr",
    "Cay TV": "CayTV.tr",
    "Cekmeköy TV": "CekmekoytBelTV.tr",
    "Deha TV [Geo-blocked]": "DehaTV.tr",
    "DİM TV [Geo-blocked]": "DIMTV.tr",
    "Diyar TV": "DiyarTV.tr",
    "ETV Kayseri": "ETVKayseri.tr",
    "ETV Manisa": "ETVManisa.tr",
    "Fortuna TV": "FortunaTV.tr",
    "FX [Geo-blocked]": "FX.tr",
    "Guneydogu TV": "GuneydoguTV.tr",
    "Haber61 TV": "Haber61TV.tr",
    "Hunat TV": "HunatTV.tr",
    "Icel TV": "IcelTV.tr",
    "Kanal 3": "Kanal3.tr",
    "Kanal 12": "Kanal12.tr",
    "Kanal 15": "Kanal15.tr",
    "Kanal 23": "Kanal23.tr",
    "Kanal 26": "Kanal26.tr",
    "Kanal 32": "Kanal32.tr",
    "Kanal 33": "Kanal33.tr",
    "Kanal 38": "Kanal38.tr",
    "KANAL 58": "Kanal58.tr",
    "Kanal 68": "Kanal68.tr",
    "Kanal Firat": "KanalFirat.tr",
    "Kanal Hayat": "KanalHayat.tr",
    "Kanal V": "KanalV.tr",
    "Kent Türk TV": "KentTurkTV.tr",
    "Konya Olay TV": "KonyaOlayTV.tr",
    "Life TV": "LifeTV.tr",
    "Line TV": "LineTV.tr",
    "MaviKaradeniz": "MaviKaradenizTV.tr",
    "Mekameleen TV": "MekameleenTV.tr",
    "Mercan TV": "MercanTV.tr",
    "Milyon TV": "MilyonTV.tr",
    "MTürk TV": "MturkTV.tr",
    "Natural TV": "NaturalTV.tr",
    "On4 TV": "On4TV.tr",
    "On 6": "On6.tr",
    "Öncü TV": "OncuTV.tr",
    "Sun RTV": "SunRTV.tr",
    "Tarih TV": "TarihTV.tr",
    "Tatlises TV": "TatlisesTV.tr",
    "Tempo TV": "TempoTV.tr",
    "Tivi 6": "Tivi6.tr",
    "Ton TV": "TonTV.tr",
    "Toprak TV": "ToprakTV.tr",
    "Torba TV": "TorbaTV.tr",
    "Trakya Türk TV": "TrakyaTurkTV.tr",
    "TürkHaber": "TurkHaber.tr",
    "TV 1": "TV1.tr",
    "TV 24": "TV24.tr",
    "TV 41": "TV41.tr",
    "TV 52": "TV52.tr",
    "TV Den": "TVDen.tr",
    "TYT Turk": "TYTTurk.tr",
    "Üniversite TV": "UniversiteTV.tr",
    "Urfa Natik TV": "UrfaNatikTV.tr",
    "Vav TV": "VavTV.tr",
    "Woman TV": "WomanTV.tr",
};

// دالة لجلب og:image من صفحة globetv
function fetchGlobetvLogo(channelId) {
    return new Promise((resolve) => {
        const url = `https://globetv.app/tr/${channelId}/`;
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const match = data.match(/property="og:image"\s+content="([^"]+)"/);
                if (!match) {
                    // try reverse order
                    const match2 = data.match(/content="([^"]+)"\s+property="og:image"/);
                    resolve(match2 ? match2[1] : null);
                } else {
                    resolve(match[1]);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    });
}

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const results = {};
    let fetched = 0;

    console.log(`Fetching logos for ${Object.keys(NAME_TO_ID).length} channels...`);

    for (const [name, id] of Object.entries(NAME_TO_ID)) {
        const logo = await fetchGlobetvLogo(id);
        if (logo && logo.startsWith('http') && !logo.includes('globe')) {
            results[name] = logo;
            console.log(`✅ ${name} -> ${logo}`);
            fetched++;
        } else {
            console.log(`⚠️  ${name} (${id}) - no logo`);
        }
        await delay(300); // avoid rate limiting
    }

    console.log(`\nFound ${fetched} logos`);

    if (fetched === 0) {
        console.log('No logos found, exiting.');
        return;
    }

    // تحديث iptv-channels.ts
    const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
    let content = fs.readFileSync(iptvFile, 'utf8');

    const turkeyStart = content.indexOf('"Turkey": [');
    const turkeyEnd = (() => {
        let depth = 0;
        let pos = turkeyStart + '"Turkey": ['.length;
        while (pos < content.length) {
            if (content[pos] === '[') depth++;
            else if (content[pos] === ']') {
                if (depth === 0) return pos + 1;
                depth--;
            }
            pos++;
        }
        return -1;
    })();

    const before = content.slice(0, turkeyStart);
    let block = content.slice(turkeyStart, turkeyEnd);
    const after = content.slice(turkeyEnd);

    let updated = 0;
    for (const [name, logo] of Object.entries(results)) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(name: "${escapedName}"[^}]+logo: )""`, 'g');
        const newBlock = block.replace(regex, `$1"${logo}"`);
        if (newBlock !== block) { updated++; block = newBlock; }
    }

    fs.writeFileSync(iptvFile, before + block + after, 'utf8');
    console.log(`\n✅ Updated ${updated} channels in iptv-channels.ts`);
}

main().catch(console.error);
