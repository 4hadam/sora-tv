/**
 * جلب شعارات جميع قنوات تركيا من globetv.app
 * يستبدل الروابط المعطوبة (Wikipedia وغيرها) بروابط صحيحة
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// قاعدة بيانات iptv-org: اسم القناة -> channelId (remove BOM if present)
const trIdsRaw = fs.readFileSync(path.join(ROOT, 'output/tr_ids.json'), 'utf8').replace(/^\uFEFF/, '');
const trIds = JSON.parse(trIdsRaw);
// بناء خريطة name (lowercase) -> id
const nameToId = {};
for (const ch of trIds) {
    nameToId[ch.name.toLowerCase().trim()] = ch.id;
}

// بعض التعيينات اليدوية للقنوات التي تختلف أسماؤها
const MANUAL_ID_MAP = {
    "24 tv": "24TV.tr",
    "360 tv": "360.tr",
    "4u tv": "4UTV.tr",
    "a haber": "AHaber.tr",
    "a türk izmir": "ATurkIzmir.tr",
    "afroturk tv": "AfroturkTV.tr",
    "akit tv": "AkitTV.tr",
    "aksu tv": "AksuTV.tr",
    "alanya posta tv": "AlanyaPostaTV.tr",
    "almahriah tv": "AlmahriahTV.tr",
    "altas tv": "AltasTV.tr",
    "anadolu net tv": "AnadoluNetTV.tr",
    "aras tv": "ARASTV.tr",
    "atv": "ATV.tr",
    "atv alanya": "ATVAlanya.tr",
    "atv avrupa": "ATVAvrupa.tr",
    "bengütürk tv": "BenguturkTV.tr",
    "benguturk tv": "BenguturkTV.tr",
    "berat tv": "BeratTV.tr",
    "beyaz tv": "BeyazTV.tr",
    "bir tv": "BirTV.tr",
    "bizimev tv": "BizimevTV.tr",
    "bloomberg ht": "BloombergHT.tr",
    "bloomberght": "BloombergHT.tr",
    "brtv [geo-blocked]": "BRTV.tr",
    "bursa as tv": "BursaASTV.tr",
    "bursa as tv [geo-blocked]": "BursaASTV.tr",
    "bursa tv": "BursaTV.tr",
    "can tv": "CanTV.tr",
    "cay tv": "CayTV.tr",
    "cekmeköy tv": "CekmekoytBelTV.tr",
    "cgtn documentary": "CGTNDocumentary.tr",
    "çiftçi tv": "CiftciTV.tr",
    "cnbc-e": "CNBCe.tr",
    "cnn türk": "CNNTurk.tr",
    "deha tv [geo-blocked]": "DehaTV.tr",
    "deniz postası tv": "DenizPostasiTV.tr",
    "dha": "DHA.tr",
    "dim tv [geo-blocked]": "DIMTV.tr",
    "di̇m tv [geo-blocked]": "DIMTV.tr",
    "diyanet tv": "DiyanetTV.tr",
    "diyar tv": "DiyarTV.tr",
    "dream türk": "DreamTurk.tr",
    "edessa tv": "EdessaTV.tr",
    "er tv [geo-blocked]": "ErTV.tr",
    "erzurum web tv": "ErzurumWebTV.tr",
    "es tv": "ESTV.tr",
    "etv kayseri": "ETVKayseri.tr",
    "etv manisa": "ETVManisa.tr",
    "euro d": "EuroD.tr",
    "eurostar tv": "EuroStar.tr",
    "fb tv": "FBTV.tr",
    "finans turk tv": "FinansTurkTV.tr",
    "flash tv": "FlashTV.tr",
    "fortuna tv": "FortunaTV.tr",
    "fx [geo-blocked]": "FX.tr",
    "grt": "GRT.tr",
    "guneydogu tv": "GuneydoguTV.tr",
    "gzt": "GZT.tr",
    "haber global": "HaberGlobal.tr",
    "haber61 tv": "Haber61TV.tr",
    "habertürk tv": "HaberturkTV.tr",
    "halk tv": "HalkTV.tr",
    "helwa tv": "HelwaTV.tr",
    "htspor tv": "HTSporTV.tr",
    "hunat tv": "HunatTV.tr",
    "hunat tv [geo-blocked]": "HunatTV.tr",
    "ibb tv": "IBBTV.tr",
    "icel tv": "IcelTV.tr",
    "kanal 3": "Kanal3.tr",
    "kanal 7": "Kanal7.tr",
    "kanal 7 avrupa": "Kanal7Avrupa.tr",
    "kanal 12": "Kanal12.tr",
    "kanal 15": "Kanal15.tr",
    "kanal 23": "Kanal23.tr",
    "kanal 26": "Kanal26.tr",
    "kanal 32": "Kanal32.tr",
    "kanal 33": "Kanal33.tr",
    "kanal 34": "Kanal34.tr",
    "kanal 38": "Kanal38.tr",
    "kanal 58": "Kanal58.tr",
    "kanal d": "KanalD.tr",
    "kanal d drama": "KanalDDrama.tr",
    "kanal firat": "KanalFirat.tr",
    "kanal hayat": "KanalHayat.tr",
    "kanal v": "KanalV.tr",
    "kanal z [geo-blocked]": "KanalZ.tr",
    "kay tv [geo-blocked]": "KayTV.tr",
    "kent türk tv": "KentTurkTV.tr",
    "konya olay tv": "KonyaOlayTV.tr",
    "kral pop tv": "KralPopTV.tr",
    "kudüs tv [geo-blocked]": "KudusTv.tr",
    "lalegul tv": "LalegulTV.tr",
    "lalegül tv": "LalegulTV.tr",
    "life tv": "LifeTV.tr",
    "line tv": "LineTV.tr",
    "mavikaradeniz": "MaviKaradenizTV.tr",
    "med muzik": "MedMuzik.tr",
    "mekameleen tv": "MekameleenTV.tr",
    "meltem tv": "MeltemTV.tr",
    "mercan tv": "MercanTV.tr",
    "milyon tv": "MilyonTV.tr",
    "minika cocuk": "MinikaÇocuk.tr",
    "minika go": "MinikaGo.tr",
    "mtürk tv": "MTurkTV.tr",
    "national geographic [geo-blocked]": "NationalGeographic.tr",
    "national geographic wild [geo-blocked]": "NationalGeographicWild.tr",
    "natural tv": "NaturalTV.tr",
    "now tv": "NowTV.tr",
    "ntv": "NTV.tr",
    "number 1 ask": "Number1Ask.tr",
    "number 1 damar": "Number1Damar.tr",
    "number 1 dance": "Number1Dance.tr",
    "number 1 türk": "Number1Turk.tr",
    "number 1 tv": "Number1TV.tr",
    "olay türk tv kayseri [geo-blocked]": "OlayTurkTV.tr",
    "on 6": "On6.tr",
    "on4 tv": "On4TV.tr",
    "öncü tv": "OncuTV.tr",
    "power dance": "PowerDance.tr",
    "power love": "PowerLove.tr",
    "power turk": "PowerTurk.tr",
    "power tv": "PowerTV.tr",
    "power türk akustik": "PowerTurkAkustik.tr",
    "power türk slow": "PowerTurkSlow.tr",
    "power türk taptaze": "PowerTurkTaptaze.tr",
    "powerturk tv": "PowerTurkTV.tr",
    "powertürk tv": "PowerTurkTV.tr",
    "s sport": "SSport.tr",
    "s sport 2": "SSport2.tr",
    "sat7 türk": "Sat7Turk.tr",
    "semerkand tv": "SemerkandTV.tr",
    "sports tv [geo-blocked]": "SportsTV.tr",
    "sun rtv": "SunRTV.tr",
    "tabii spor 6 [geo-blocked]": "TabiiSpor6.tr",
    "tarih tv": "TarihTV.tr",
    "tarim tv": "TarimTV.tr",
    "tatlises tv": "TatlisesTV.tr",
    "tbmm tv": "TBMMTV.tr",
    "tele 1": "Tele1.tr",
    "tempo tv": "TempoTV.tr",
    "teve2": "Teve2.tr",
    "tgrt belgesel tv": "TGRTBelgesel.tr",
    "tgrt europe": "TGRTEurope.tr",
    "tgrt haber": "TGRTHaber.tr",
    "tivi 6": "Tivi6.tr",
    "tjk tv": "TJKTV.tr",
    "tjk tv 2": "TJKTV2.tr",
    "tmb": "TMB.tr",
    "ton tv": "TonTV.tr",
    "toprak tv": "ToprakTV.tr",
    "torba tv": "TorbaTV.tr",
    "tr24 tv": "TR24TV.tr",
    "trabzon buyuksehir belediyesi tv": "TrabzonBuyuksehirTV.tr",
    "trakya türk tv": "TrakyaTurkTV.tr",
    "trt 1": "TRT1.tr",
    "trt 2": "TRT2.tr",
    "trt 3": "TRT3.tr",
    "trt arabi": "TRTArabi.tr",
    "trt avaz": "TRTAvaz.tr",
    "trt belgesel": "TRTBelgesel.tr",
    "trt çocuk": "TRTCocuk.tr",
    "trt diyanet çocuk": "TRTDiyanetCocuk.tr",
    "trt eba ilkokul": "TRTEBAIlkokul.tr",
    "trt eba lise": "TRTEBALise.tr",
    "trt eba ortaokul": "TRTEBAOrtaokul.tr",
    "trt haber": "TRTHaber.tr",
    "trt kurdî": "TRTKurdi.tr",
    "trt müzik": "TRTMuzik.tr",
    "trt spor [geo-blocked]": "TRTSpor.tr",
    "trt spor yildiz [geo-blocked]": "TRTSporYildiz.tr",
    "trt türk": "TRTTurk.tr",
    "trt world": "TRTWorld.tr",
    "türkhaber": "TurkHaber.tr",
    "tv 1": "TV1.tr",
    "tv 8": "TV8.tr",
    "tv 24": "TV24.tr",
    "tv 38": "TV38.tr",
    "tv 41": "TV41.tr",
    "tv 52": "TV52.tr",
    "tv 100": "TV100.tr",
    "tv 264": "TV264.tr",
    "tv den": "TVDen.tr",
    "tv4": "TV4.tr",
    "tvnet": "TVnet.tr",
    "tyt turk": "TYTTurk.tr",
    "ülke tv": "UlkeTV.tr",
    "üniversite tv": "UniversiteTV.tr",
    "urfa natik tv": "UrfaNatikTV.tr",
    "üü tv üsküdar üniversitesi tv": "UUTVUskudar.tr",
    "v tv": "VTV.tr",
    "vav tv": "VavTV.tr",
    "viasat explore": "ViasatExplore.tr",
    "woman tv": "WomanTV.tr",
    "zarok tv": "ZarokTV.tr",
    "disney jr. [geo-blocked]": "DisneyJunior.tr",
    "minika cocuk": "MinikaÇocuk.tr",
    "minika go": "MinikaGo.tr",
    "kanal avrupa": "KanalAvrupa.tr",
    "kanal b": "KanalB.tr",
    "on medya haber [geo-blocked]": "OnMedyaHaber.tr",
    "qaf tv": "QafTV.tr",
    "kanal 68": "Kanal68.tr",
    "milyon tv": "MilyonTV.tr",
    "satranç tv": "SatranTV.tr",
    "sun rtv": "SunRTV.tr",
    "tyt turk": "TYTTurk.tr",
    "erzurum web tv": "ErzurumWebTV.tr",
};

function fetchGlobetvLogo(channelId) {
    return new Promise((resolve) => {
        const url = `https://globetv.app/tr/${channelId}/`;
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Try both attribute orders
                const m1 = data.match(/property="og:image"\s+content="([^"]+)"/);
                const m2 = data.match(/content="([^"]+)"\s+property="og:image"/);
                const logo = m1 ? m1[1] : (m2 ? m2[1] : null);
                // Reject if it's the globetv default/flag image
                if (logo && logo.startsWith('http') && !logo.includes('globetv.app/img') && !logo.includes('flag')) {
                    resolve(logo);
                } else {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    });
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    // قراءة ملف iptv-channels.ts
    const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
    const content = fs.readFileSync(iptvFile, 'utf8');

    // استخراج أسماء جميع قنوات تركيا
    const turkeyStart = content.indexOf('"Turkey": [');
    const turkeyEnd = (() => {
        let depth = 0, pos = turkeyStart + 11;
        while (pos < content.length) {
            if (content[pos] === '[') depth++;
            else if (content[pos] === ']') { if (depth === 0) return pos + 1; depth--; }
            pos++;
        }
        return -1;
    })();
    const turkeyBlock = content.slice(turkeyStart, turkeyEnd);

    // استخراج كل قناة (اسم + شعار حالي)
    const channels = [];
    const regex = /name: "([^"]+)"[^}]+logo: "([^"]*)"/g;
    let m;
    while ((m = regex.exec(turkeyBlock)) !== null) {
        channels.push({ name: m[1], currentLogo: m[2] });
    }
    console.log(`Total Turkey channels: ${channels.length}`);

    // نجمع القنوات التي تحتاج تحديثاً: بدون شعار أو لها رابط Wikipedia معطوب
    const toFetch = channels.filter(ch =>
        ch.currentLogo === '' || ch.currentLogo.includes('wikimedia.org')
    );
    console.log(`Channels needing logo update: ${toFetch.length}\n`);

    const results = {};

    for (const ch of toFetch) {
        const key = ch.name.toLowerCase().trim();
        const channelId = MANUAL_ID_MAP[key] || nameToId[key];

        if (!channelId) {
            console.log(`⚠️  No ID found for: ${ch.name}`);
            continue;
        }

        const logo = await fetchGlobetvLogo(channelId);
        if (logo) {
            results[ch.name] = logo;
            console.log(`✅ ${ch.name} -> ${logo}`);
        } else {
            console.log(`❌ ${ch.name} (${channelId}) - no logo`);
        }
        await delay(250);
    }

    console.log(`\nFetched ${Object.keys(results).length} logos`);

    if (Object.keys(results).length === 0) return;

    // تحديث ملف iptv-channels.ts
    let before = content.slice(0, turkeyStart);
    let block = content.slice(turkeyStart, turkeyEnd);
    let after = content.slice(turkeyEnd);

    let updated = 0;
    for (const [name, logo] of Object.entries(results)) {
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // استبدال logo: "" أو logo: "https://upload.wikimedia..."
        const rgx = new RegExp(`(name: "${esc}"[^}]+logo: )"[^"]*"`, 'g');
        const newBlock = block.replace(rgx, `$1"${logo}"`);
        if (newBlock !== block) { updated++; block = newBlock; }
    }

    fs.writeFileSync(iptvFile, before + block + after, 'utf8');
    console.log(`\n✅ Updated ${updated} channel logos in iptv-channels.ts`);

    // إحصاء نهائي
    const finalBlock = block;
    const withLogo = (finalBlock.match(/logo: "https/g) || []).length;
    const noLogo = (finalBlock.match(/logo: ""/g) || []).length;
    console.log(`📊 With logo: ${withLogo} | Missing: ${noLogo}`);
}

main().catch(console.error);
