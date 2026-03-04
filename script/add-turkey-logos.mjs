/**
 * إضافة شعارات قنوات تركيا - مصادر: Wikipedia/Wikimedia + CDN رسمية
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// خريطة الشعارات اليدوية للقنوات التركية
const LOGO_MAP = {
    // عائلة TRT
    "TRT 1": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/TRT_1_2021_logo.svg/200px-TRT_1_2021_logo.svg.png",
    "TRT 2": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/TRT_2_logo.svg/200px-TRT_2_logo.svg.png",
    "TRT 3": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/TRT_3_logo.svg/200px-TRT_3_logo.svg.png",
    "TRT Haber": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/TRT_Haber_logo.svg/200px-TRT_Haber_logo.svg.png",
    "TRT Spor [Geo-blocked]": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/TRT_Spor_logo.svg/200px-TRT_Spor_logo.svg.png",
    "TRT Spor Yildiz [Geo-blocked]": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/TRT_Spor_Y%C4%B1ld%C4%B1z_logo.svg/200px-TRT_Spor_Y%C4%B1ld%C4%B1z_logo.svg.png",
    "TRT Çocuk": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/TRT_%C3%87ocuk_logo.svg/200px-TRT_%C3%87ocuk_logo.svg.png",
    "TRT Müzik": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/TRT_M%C3%BCzik_logo.svg/200px-TRT_M%C3%BCzik_logo.svg.png",
    "TRT Belgesel": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/TRT_Belgesel_logo.svg/200px-TRT_Belgesel_logo.svg.png",
    "TRT Avaz": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/TRT_Avaz_logo.svg/200px-TRT_Avaz_logo.svg.png",
    "TRT Arabi": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/TRT_Arabi_logo.svg/200px-TRT_Arabi_logo.svg.png",
    "TRT Kurdî": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/TRT_Kurd%C3%AE.svg/200px-TRT_Kurd%C3%AE.svg.png",
    "TRT Türk": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/TRT_T%C3%BCrk_logo.svg/200px-TRT_T%C3%BCrk_logo.svg.png",
    "TRT World": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/TRT_World_logo.svg/200px-TRT_World_logo.svg.png",
    "TRT Diyanet Çocuk": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/TRT_%C3%87ocuk_logo.svg/200px-TRT_%C3%87ocuk_logo.svg.png",
    "TRT EBA Ilkokul": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/TRT_EBA_TV_logo.svg/200px-TRT_EBA_TV_logo.svg.png",
    "TRT EBA Lise": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/TRT_EBA_TV_logo.svg/200px-TRT_EBA_TV_logo.svg.png",
    "TRT EBA Ortaokul": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/TRT_EBA_TV_logo.svg/200px-TRT_EBA_TV_logo.svg.png",
    // قنوات رئيسية
    "ATV": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/ATV_logo_2016.svg/200px-ATV_logo_2016.svg.png",
    "ATV Alanya": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/ATV_logo_2016.svg/200px-ATV_logo_2016.svg.png",
    "ATV Avrupa": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/ATV_logo_2016.svg/200px-ATV_logo_2016.svg.png",
    "Kanal D": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Kanal_D_logo.svg/200px-Kanal_D_logo.svg.png",
    "Kanal D Drama": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Kanal_D_logo.svg/200px-Kanal_D_logo.svg.png",
    "Kanal 7": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Kanal7logo.png/200px-Kanal7logo.png",
    "Kanal 7 Avrupa": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Kanal7logo.png/200px-Kanal7logo.png",
    "TV 8": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/TV8_logo_2021.svg/200px-TV8_logo_2021.svg.png",
    "Teve2": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Teve2_logo.svg/200px-Teve2_logo.svg.png",
    "NOW TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Now_TV_Turkey_logo.svg/200px-Now_TV_Turkey_logo.svg.png",
    "Flash TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Flash_TV.svg/200px-Flash_TV.svg.png",
    "Euro D": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Euro_D_logo.svg/200px-Euro_D_logo.svg.png",
    "EuroStar TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Eurostar_TV.svg/200px-Eurostar_TV.svg.png",
    "Ülke TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/%C3%9Clke_TV_logo.svg/200px-%C3%9Clke_TV_logo.svg.png",
    "TV4": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/TV4_Turkey_logo.svg/200px-TV4_Turkey_logo.svg.png",
    "Beyaz TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Beyaz_TV_logo.svg/200px-Beyaz_TV_logo.svg.png",
    "Dream Türk": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Dream_TV_logo.svg/200px-Dream_TV_logo.svg.png",
    // أخبار
    "NTV": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/NTV_Turkey_Logo.svg/200px-NTV_Turkey_Logo.svg.png",
    "CNN Türk": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/CNN_T%C3%BCrk.svg/200px-CNN_T%C3%BCrk.svg.png",
    "Habertürk TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Habertürk_TV.svg/200px-Habertürk_TV.svg.png",
    "Haber Global": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/HaberGlobal.png/200px-HaberGlobal.png",
    "Halk TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Halktv-logo.png/200px-Halktv-logo.png",
    "Bloomberg HT": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bloomberg_HT_logo.svg/200px-Bloomberg_HT_logo.svg.png",
    "BloombergHT": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bloomberg_HT_logo.svg/200px-Bloomberg_HT_logo.svg.png",
    "Tele 1": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Tele1_TV_Turkey.png/200px-Tele1_TV_Turkey.png",
    "TGRT Haber": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/TGRT_Haber_logo.svg/200px-TGRT_Haber_logo.svg.png",
    "TGRT Europe": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/TGRT_Haber_logo.svg/200px-TGRT_Haber_logo.svg.png",
    "TGRT Belgesel TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/TGRT_Haber_logo.svg/200px-TGRT_Haber_logo.svg.png",
    "TR24 TV": "https://tr24.com.tr/wp-content/uploads/2023/01/tr24-logo.png",
    "TBMM TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/TBMM_Logo.svg/200px-TBMM_Logo.svg.png",
    "24 TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/24TV_Turkey.svg/200px-24TV_Turkey.svg.png",
    "TV 100": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/TV100_logo.svg/200px-TV100_logo.svg.png",
    "360 TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/360TV_Turkey.svg/200px-360TV_Turkey.svg.png",
    "CNBC-e": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/CNBC-e_logo.svg/200px-CNBC-e_logo.svg.png",
    "GZT": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/GZT_logo.svg/200px-GZT_logo.svg.png",
    "TVnet": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/TVnet_logo.svg/200px-TVnet_logo.svg.png",
    "BENGÜTÜRK TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Bengut%C3%BCrk_TV_logo.svg/200px-Bengut%C3%BCrk_TV_logo.svg.png",
    "Benguturk TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Bengut%C3%BCrk_TV_logo.svg/200px-Bengut%C3%BCrk_TV_logo.svg.png",
    "DHA": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/DHA_logo.svg/200px-DHA_logo.svg.png",
    // رياضة
    "HTSpor TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bloomberg_HT_logo.svg/200px-Bloomberg_HT_logo.svg.png",
    "S Sport": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/S_Sport_logo.svg/200px-S_Sport_logo.svg.png",
    "S Sport 2": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/S_Sport_logo.svg/200px-S_Sport_logo.svg.png",
    "FB TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Fenerbah%C3%A7e_S.K._logo.svg/200px-Fenerbah%C3%A7e_S.K._logo.svg.png",
    "TJK TV": "https://www.tjk.org/Media/UserFiles/images/TJK-Logo.png",
    "TJK TV 2": "https://www.tjk.org/Media/UserFiles/images/TJK-Logo.png",
    // موسيقى
    "KRAL Pop TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Kral_Pop_TV_logo.svg/200px-Kral_Pop_TV_logo.svg.png",
    "Power Turk": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/PowerTurk_TV_logo.svg/200px-PowerTurk_TV_logo.svg.png",
    "PowerTurk TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/PowerTurk_TV_logo.svg/200px-PowerTurk_TV_logo.svg.png",
    "PowerTürk TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/PowerTurk_TV_logo.svg/200px-PowerTurk_TV_logo.svg.png",
    "Power TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Power_TV_logo.svg/200px-Power_TV_logo.svg.png",
    "Power Dance": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Power_TV_logo.svg/200px-Power_TV_logo.svg.png",
    "Power Love": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Power_TV_logo.svg/200px-Power_TV_logo.svg.png",
    "Power Türk Akustik": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/PowerTurk_TV_logo.svg/200px-PowerTurk_TV_logo.svg.png",
    "Power Türk Slow": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/PowerTurk_TV_logo.svg/200px-PowerTurk_TV_logo.svg.png",
    "Power Türk Taptaze": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/PowerTurk_TV_logo.svg/200px-PowerTurk_TV_logo.svg.png",
    "Number 1 TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Number1TV_logo.svg/200px-Number1TV_logo.svg.png",
    "Number 1 Türk": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Number1TV_logo.svg/200px-Number1TV_logo.svg.png",
    "Number 1 Ask": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Number1TV_logo.svg/200px-Number1TV_logo.svg.png",
    "Number 1 Damar": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Number1TV_logo.svg/200px-Number1TV_logo.svg.png",
    "Number 1 Dance": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Number1TV_logo.svg/200px-Number1TV_logo.svg.png",
    // أطفال
    "Minika Cocuk": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Minika_%C3%87ocuk_logo.svg/200px-Minika_%C3%87ocuk_logo.svg.png",
    "Minika Go": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Minika_GO_logo.svg/200px-Minika_GO_logo.svg.png",
    "Disney Jr. [Geo-blocked]": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Disney_Junior_2021_logo.svg/200px-Disney_Junior_2021_logo.svg.png",
    // وثائقي
    "National Geographic [Geo-blocked]": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/National_Geographic_Channel_new_logo.svg/200px-National_Geographic_Channel_new_logo.svg.png",
    "National Geographic Wild [Geo-blocked]": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Nat_Geo_Wild.svg/200px-Nat_Geo_Wild.svg.png",
    "CGTN Documentary": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/CGTN_Documentary_logo.svg/200px-CGTN_Documentary_logo.svg.png",
    "Viasat Explore": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Viasat_Explore_logo.svg/200px-Viasat_Explore_logo.svg.png",
    // ديني
    "Diyanet TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Diyanet_TV_logo.svg/200px-Diyanet_TV_logo.svg.png",
    "Sat7 Türk": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/SAT-7_logo.svg/200px-SAT-7_logo.svg.png",
    "Lalegul TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Laleg%C3%BCl_TV_logo.svg/200px-Laleg%C3%BCl_TV_logo.svg.png",
    "Lalegül TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Laleg%C3%BCl_TV_logo.svg/200px-Laleg%C3%BCl_TV_logo.svg.png",
    "Akit TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Akit_TV_logo.svg/200px-Akit_TV_logo.svg.png",
    "Semerkand TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Semerkand_TV_logo.svg/200px-Semerkand_TV_logo.svg.png",
    // محلية / أخرى
    "IBB TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Istanbul_Metropolitan_Municipality_logo.svg/200px-Istanbul_Metropolitan_Municipality_logo.svg.png",
    "Meltem TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Meltem_TV_logo.svg/200px-Meltem_TV_logo.svg.png",
    "Bursa TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Bursa_TV_logo.svg/200px-Bursa_TV_logo.svg.png",
    "Kanal 34": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Kanal_34_logo.svg/200px-Kanal_34_logo.svg.png",
    "TV 38": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/TV38_logo.svg/200px-TV38_logo.svg.png",
    "Zarok TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Zarok_TV_logo.svg/200px-Zarok_TV_logo.svg.png",
    "GRT": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/GRT_logo.svg/200px-GRT_logo.svg.png",
    "Bir TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Bir_TV_logo.svg/200px-Bir_TV_logo.svg.png",
    "Kanal B": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Kanal_B_TR_logo.svg/200px-Kanal_B_TR_logo.svg.png",
    "Tarim TV": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Tar%C4%B1m_TV_logo.svg/200px-Tar%C4%B1m_TV_logo.svg.png",
};

const nameToLogo = LOGO_MAP;

console.log(`🖼️ شعارات TR متاحة: ${Object.keys(nameToLogo).length}`);

// قراءة ملف المشروع
const iptvFile = path.join(ROOT, 'shared', 'iptv-channels.ts');
let content = fs.readFileSync(iptvFile, 'utf8');

let updated = 0;
let notFound = 0;

// إيجاد بلوك Turkey
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
let turkeyBlock = content.slice(turkeyStart, turkeyEnd);
const after = content.slice(turkeyEnd);

// استبدال logo: "" بالشعار المناسب - يدعم الشكل الجديد { name: "..." ... logo: "" }
turkeyBlock = turkeyBlock.replace(
    /(name: "([^"]+)"[^}]+logo: )""/g,
    (match, prefix, name) => {
        const logoUrl = nameToLogo[name.trim()];
        if (logoUrl) { updated++; return `${prefix}"${logoUrl}"`; }
        notFound++;
        return match;
    }
);

content = before + turkeyBlock + after;
fs.writeFileSync(iptvFile, content, 'utf8');

console.log(`✅ شعارات أُضيفت: ${updated}`);
console.log(`⚠️  بدون شعار: ${notFound}`);

