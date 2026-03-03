import fs from 'fs';
import path from 'path';

// Map ISO code -> country name (to match keys in iptv-channels.ts)
const CODE_TO_COUNTRY = {
    AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AD: "Andorra", AO: "Angola",
    AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaijan",
    BS: "Bahamas", BH: "Bahrain", BD: "Bangladesh", BB: "Barbados", BY: "Belarus",
    BE: "Belgium", BZ: "Belize", BO: "Bolivia", BA: "Bosnia and Herzegovina",
    BW: "Botswana", BR: "Brazil", BN: "Brunei", BG: "Bulgaria", BF: "Burkina Faso",
    KH: "Cambodia", CM: "Cameroon", CA: "Canada", CV: "Cape Verde",
    CF: "Central African Republic", TD: "Chad", CL: "Chile", CN: "China",
    CO: "Colombia", CG: "Congo", CR: "Costa Rica", HR: "Croatia", CU: "Cuba",
    CY: "Cyprus", CZ: "Czech Republic", DK: "Denmark", DJ: "Djibouti",
    DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt", SV: "El Salvador",
    GQ: "Equatorial Guinea", EE: "Estonia", ET: "Ethiopia", FI: "Finland",
    FR: "France", GA: "Gabon", GM: "Gambia", GE: "Georgia", DE: "Germany",
    GH: "Ghana", GR: "Greece", GT: "Guatemala", GN: "Guinea", GY: "Guyana",
    HT: "Haiti", HN: "Honduras", HK: "Hong Kong", HU: "Hungary", IS: "Iceland",
    IN: "India", ID: "Indonesia", IR: "Iran", IQ: "Iraq", IE: "Ireland",
    IL: "Israel", IT: "Italy", JM: "Jamaica", JP: "Japan", JO: "Jordan",
    KZ: "Kazakhstan", KE: "Kenya", KP: "North Korea", KR: "South Korea",
    KW: "Kuwait", KG: "Kyrgyzstan", LA: "Laos", LB: "Lebanon", LK: "Sri Lanka",
    LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", LY: "Libya",
    MK: "North Macedonia", MG: "Madagascar", MW: "Malawi", MY: "Malaysia",
    MV: "Maldives", ML: "Mali", MT: "Malta", MR: "Mauritania", MX: "Mexico",
    MD: "Moldova", MN: "Mongolia", ME: "Montenegro", MA: "Morocco",
    MZ: "Mozambique", MM: "Myanmar", NA: "Namibia", NP: "Nepal",
    NL: "Netherlands", NZ: "New Zealand", NI: "Nicaragua", NE: "Niger",
    NG: "Nigeria", NO: "Norway", OM: "Oman", PK: "Pakistan", PA: "Panama",
    PY: "Paraguay", PE: "Peru", PH: "Philippines", PL: "Poland",
    PT: "Portugal", PS: "Palestine", QA: "Qatar", RO: "Romania", RU: "Russia",
    RW: "Rwanda", SA: "Saudi Arabia", SN: "Senegal", RS: "Serbia",
    SL: "Sierra Leone", SG: "Singapore", SK: "Slovakia", SI: "Slovenia",
    SO: "Somalia", ZA: "South Africa", SS: "South Sudan", ES: "Spain",
    SD: "Sudan", SE: "Sweden", CH: "Switzerland", SY: "Syria", TW: "Taiwan",
    TJ: "Tajikistan", TZ: "Tanzania", TH: "Thailand", TG: "Togo",
    TT: "Trinidad and Tobago", TN: "Tunisia", TR: "Turkey", TM: "Turkmenistan",
    UG: "Uganda", UA: "Ukraine", AE: "United Arab Emirates",
    US: "United States", UY: "Uruguay", UZ: "Uzbekistan", VE: "Venezuela",
    VN: "Vietnam", YE: "Yemen", ZM: "Zambia", ZW: "Zimbabwe",
    CD: "Democratic Republic of the Congo", KE: "Kenya", CI: "Ivory Coast",
    MW: "Malawi", BI: "Burundi", GW: "Guinea-Bissau", GN: "Guinea",
};

const OUTPUT_DIR = 'output/countries';
const CHANNELS_FILE = 'shared/iptv-channels.ts';

// Parse a single .txt file and return array of channel objects
function parseTxtFile(content, countryCode) {
    const channels = [];
    const lines = content.split('\n');

    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();

        // Match channel header like "[1] Channel Name"
        const headerMatch = line.match(/^\[(\d+)\]\s+(.+)$/);
        if (headerMatch) {
            const name = headerMatch[2].trim();
            let url = '';
            let logo = '';
            let category = 'General';

            i++;
            // Skip the dashes line
            if (i < lines.length && lines[i].trim().startsWith('---')) i++;

            // Parse fields
            while (i < lines.length) {
                const fieldLine = lines[i].trim();
                if (fieldLine.startsWith('•')) {
                    // URL line
                    const extractedUrl = fieldLine.replace(/^•\s*/, '').trim();
                    if (extractedUrl && !url) url = extractedUrl;
                } else if (fieldLine.startsWith('Logo:')) {
                    logo = fieldLine.replace(/^Logo:\s*/, '').trim();
                } else if (fieldLine.startsWith('Category:')) {
                    category = fieldLine.replace(/^Category:\s*/, '').trim() || 'General';
                } else if (fieldLine.startsWith('Language:')) {
                    // skip language field
                } else if (fieldLine.match(/^\[(\d+)\]/) || fieldLine.startsWith('===')) {
                    // Next channel or section
                    break;
                }
                i++;
            }

            if (url && name) {
                const ch = { name, url, category: category || 'General' };
                if (logo) ch.logo = logo;
                channels.push(ch);
            }
        } else {
            i++;
        }
    }

    return channels;
}

// Extract existing URLs from iptv-channels.ts to avoid duplicates
function extractExistingUrls(content) {
    const urls = new Set();
    const urlRegex = /"url":\s*"([^"]+)"/g;
    let m;
    while ((m = urlRegex.exec(content)) !== null) {
        urls.add(m[1].trim());
    }
    return urls;
}

// Check if a country block exists in the file
function countryExists(content, countryName) {
    const escaped = countryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`"${escaped}":\\s*\\[`).test(content);
}

// Build channel entry string
function buildChannelEntry(ch) {
    let entry = `    { "name": ${JSON.stringify(ch.name)}, "url": ${JSON.stringify(ch.url)}, "category": ${JSON.stringify(ch.category || 'General')}`;
    if (ch.logo) entry += `, "logo": ${JSON.stringify(ch.logo)}`;
    entry += ` }`;
    return entry;
}

function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.error('❌ output/countries directory not found');
        process.exit(1);
    }

    let content = fs.readFileSync(CHANNELS_FILE, 'utf8');
    const existingUrls = extractExistingUrls(content);

    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.txt'));

    let totalAdded = 0;
    let totalSkipped = 0;
    let newCountries = 0;

    for (const file of files) {
        const code = file.replace('.txt', '').toUpperCase();
        const countryName = CODE_TO_COUNTRY[code];

        if (!countryName) {
            console.log(`⚠️  No country mapping for code: ${code}`);
            continue;
        }

        const filePath = path.join(OUTPUT_DIR, file);
        const txtContent = fs.readFileSync(filePath, 'utf8');
        const channels = parseTxtFile(txtContent, code);

        if (channels.length === 0) continue;

        // Filter out duplicates
        const newChannels = channels.filter(ch => !existingUrls.has(ch.url));
        totalSkipped += channels.length - newChannels.length;

        if (newChannels.length === 0) continue;

        // Add new URLs to set
        newChannels.forEach(ch => existingUrls.add(ch.url));
        totalAdded += newChannels.length;

        const newEntries = newChannels.map(buildChannelEntry).join(',\n');

        if (countryExists(content, countryName)) {
            // Find end of country block and insert before it
            const escaped = countryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Find "CountryName": [ ... ] - insert before closing ]
            const blockRegex = new RegExp(`("${escaped}":\\s*\\[)([\\s\\S]*?)(\\n  \\])`, 'm');
            const match = blockRegex.exec(content);
            if (match) {
                const currentBlock = match[2];
                const hasChannels = currentBlock.trim().length > 0;
                const separator = hasChannels ? ',\n' : '\n';
                content = content.slice(0, match.index) +
                    match[1] + match[2] +
                    (hasChannels ? ',' : '') + '\n' + newEntries + '\n  ]' +
                    content.slice(match.index + match[0].length);
                console.log(`✅ ${countryName} (${code}): +${newChannels.length} channels`);
            } else {
                console.log(`⚠️  Could not find block for ${countryName}`);
            }
        } else {
            // Country doesn't exist - add new block at end before closing }
            const newBlock = `  "${countryName}": [\n${newEntries}\n  ],\n`;
            content = content.replace(/^};$/m, newBlock + '};');
            console.log(`🆕 ${countryName} (${code}): NEW country with ${newChannels.length} channels`);
            newCountries++;
        }
    }

    fs.writeFileSync(CHANNELS_FILE, content, 'utf8');

    console.log('\n========================================');
    console.log(`✅ Done!`);
    console.log(`   Added: ${totalAdded} new channels`);
    console.log(`   Skipped (duplicates): ${totalSkipped}`);
    console.log(`   New countries: ${newCountries}`);
    console.log('========================================');
}

main();
