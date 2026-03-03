// Download all country channels from IPTV.org and save as txt files
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const OUTPUT_DIR = new URL('../output/countries', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
mkdirSync(OUTPUT_DIR, { recursive: true })

const COUNTRIES = [
    'ad', 'ae', 'af', 'ag', 'al', 'am', 'ao', 'ar', 'at', 'au', 'az',
    'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bn', 'bo', 'br', 'bs', 'bw', 'by', 'bz',
    'ca', 'cd', 'cf', 'cg', 'ch', 'ci', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cy', 'cz',
    'de', 'dj', 'dk', 'do', 'dz', 'ec', 'ee', 'eg', 'es', 'et',
    'fi', 'fj', 'fr', 'ga', 'gb', 'ge', 'gh', 'gm', 'gn', 'gq', 'gr', 'gt', 'gw', 'gy',
    'hk', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'in', 'iq', 'ir', 'is', 'it',
    'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'kp', 'kr', 'kw', 'kz',
    'la', 'lb', 'lk', 'lr', 'lt', 'lu', 'lv', 'ly',
    'ma', 'md', 'me', 'mg', 'mk', 'ml', 'mm', 'mn', 'mr', 'mt', 'mv', 'mw', 'mx', 'my', 'mz',
    'na', 'ne', 'ng', 'ni', 'nl', 'no', 'np', 'nz', 'om',
    'pa', 'pe', 'ph', 'pk', 'pl', 'ps', 'pt', 'py', 'qa',
    'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sd', 'se', 'sg', 'si', 'sk', 'sn', 'so', 'ss', 'sv', 'sy',
    'td', 'tg', 'th', 'tj', 'tn', 'tr', 'tt', 'tw', 'tz',
    'ua', 'ug', 'us', 'uy', 'uz', 've', 'vn', 'ye', 'za', 'zm', 'zw'
]

const NAMES = {
    ae: 'United Arab Emirates', af: 'Afghanistan', al: 'Albania', am: 'Armenia', ao: 'Angola', ar: 'Argentina',
    at: 'Austria', au: 'Australia', az: 'Azerbaijan', ba: 'Bosnia', bb: 'Barbados', bd: 'Bangladesh',
    be: 'Belgium', bf: 'Burkina Faso', bg: 'Bulgaria', bh: 'Bahrain', bn: 'Brunei', bo: 'Bolivia',
    br: 'Brazil', bs: 'Bahamas', bw: 'Botswana', by: 'Belarus', bz: 'Belize', ca: 'Canada',
    cd: 'Congo DR', cf: 'Central African Republic', cg: 'Congo', ch: 'Switzerland', ci: 'Ivory Coast',
    cl: 'Chile', cm: 'Cameroon', cn: 'China', co: 'Colombia', cr: 'Costa Rica', cu: 'Cuba',
    cv: 'Cape Verde', cy: 'Cyprus', cz: 'Czech Republic', de: 'Germany', dj: 'Djibouti',
    dk: 'Denmark', do: 'Dominican Republic', dz: 'Algeria', ec: 'Ecuador', ee: 'Estonia',
    eg: 'Egypt', es: 'Spain', et: 'Ethiopia', fi: 'Finland', fj: 'Fiji', fr: 'France', ga: 'Gabon',
    gb: 'United Kingdom', ge: 'Georgia', gh: 'Ghana', gm: 'Gambia', gn: 'Guinea', gq: 'Equatorial Guinea',
    gr: 'Greece', gt: 'Guatemala', gw: 'Guinea-Bissau', gy: 'Guyana', hk: 'Hong Kong', hn: 'Honduras',
    hr: 'Croatia', ht: 'Haiti', hu: 'Hungary', id: 'Indonesia', ie: 'Ireland', il: 'Israel',
    in: 'India', iq: 'Iraq', ir: 'Iran', is: 'Iceland', it: 'Italy', jm: 'Jamaica', jo: 'Jordan',
    jp: 'Japan', ke: 'Kenya', kg: 'Kyrgyzstan', kh: 'Cambodia', kp: 'North Korea', kr: 'South Korea',
    kw: 'Kuwait', kz: 'Kazakhstan', la: 'Laos', lb: 'Lebanon', lk: 'Sri Lanka', lr: 'Liberia',
    lt: 'Lithuania', lu: 'Luxembourg', lv: 'Latvia', ly: 'Libya', ma: 'Morocco', md: 'Moldova',
    me: 'Montenegro', mg: 'Madagascar', mk: 'North Macedonia', ml: 'Mali', mm: 'Myanmar',
    mn: 'Mongolia', mr: 'Mauritania', mt: 'Malta', mv: 'Maldives', mw: 'Malawi', mx: 'Mexico',
    my: 'Malaysia', mz: 'Mozambique', na: 'Namibia', ne: 'Niger', ng: 'Nigeria', ni: 'Nicaragua',
    nl: 'Netherlands', no: 'Norway', np: 'Nepal', nz: 'New Zealand', om: 'Oman', pa: 'Panama',
    pe: 'Peru', ph: 'Philippines', pk: 'Pakistan', pl: 'Poland', ps: 'Palestine', pt: 'Portugal',
    py: 'Paraguay', qa: 'Qatar', ro: 'Romania', rs: 'Serbia', ru: 'Russia', rw: 'Rwanda',
    sa: 'Saudi Arabia', sb: 'Solomon Islands', sd: 'Sudan', se: 'Sweden', sg: 'Singapore',
    si: 'Slovenia', sk: 'Slovakia', sn: 'Senegal', so: 'Somalia', ss: 'South Sudan',
    sv: 'El Salvador', sy: 'Syria', td: 'Chad', tg: 'Togo', th: 'Thailand', tj: 'Tajikistan',
    tn: 'Tunisia', tr: 'Turkey', tt: 'Trinidad and Tobago', tw: 'Taiwan', tz: 'Tanzania',
    ua: 'Ukraine', ug: 'Uganda', us: 'United States', uy: 'Uruguay', uz: 'Uzbekistan',
    ve: 'Venezuela', vn: 'Vietnam', ye: 'Yemen', za: 'South Africa', zm: 'Zambia', zw: 'Zimbabwe',
    ad: 'Andorra', ag: 'Antigua and Barbuda',
}

function parseM3U(text) {
    const lines = text.replace(/\r/g, '').split('\n')
    const channels = []
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith('#EXTINF')) continue
        const logoMatch = lines[i].match(/tvg-logo="([^"]+)"/)
        const groupMatch = lines[i].match(/group-title="([^"]+)"/)
        const langMatch = lines[i].match(/tvg-language="([^"]+)"/)
        const nameMatch = lines[i].match(/,(.+)$/)
        let url = ''
        let j = i + 1
        while (j < lines.length && lines[j].startsWith('#')) j++
        if (j < lines.length && !lines[j].startsWith('#')) url = lines[j].trim()
        if (nameMatch && url) {
            channels.push({
                name: nameMatch[1].replace(/\s*\(\d+p\)$/, '').trim(),
                url,
                logo: logoMatch ? logoMatch[1] : '',
                category: groupMatch ? groupMatch[1] : 'General',
                language: langMatch ? langMatch[1] : '',
            })
        }
    }
    return channels
}

console.log(`📥 Downloading ${COUNTRIES.length} countries from IPTV.org...\n`)

let totalChannels = 0
let success = 0
const BATCH = 8

for (let i = 0; i < COUNTRIES.length; i += BATCH) {
    const batch = COUNTRIES.slice(i, i + BATCH)

    await Promise.all(batch.map(async code => {
        try {
            const res = await fetch(`https://iptv-org.github.io/iptv/countries/${code}.m3u`, {
                signal: AbortSignal.timeout(20000)
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const channels = parseM3U(await res.text())
            if (!channels.length) return

            const name = NAMES[code] || code.toUpperCase()
            const sep = '='.repeat(60)
            const lines = [
                sep, `${name} (${code.toUpperCase()})`, sep,
                `Total Channels: ${channels.length}`,
                `Source: https://tv.garden/`,
                sep, '',
                ...channels.flatMap((ch, idx) => [
                    `[${idx + 1}] ${ch.name}`,
                    '-'.repeat(48),
                    `IPTV URLs (1):\n  • ${ch.url}`,
                    ch.logo ? `Logo: ${ch.logo}` : null,
                    ch.language ? `Language: ${ch.language}` : null,
                    ch.category ? `Category: ${ch.category}` : null,
                    ''
                ].filter(Boolean))
            ]

            writeFileSync(join(OUTPUT_DIR, `${code.toUpperCase()}.txt`), lines.join('\n'), 'utf8')
            totalChannels += channels.length
            success++
            console.log(`✅ ${code.toUpperCase()}: ${channels.length} channels`)
        } catch (e) {
            console.log(`⚪ ${code.toUpperCase()}: ${e.message}`)
        }
    }))

    await new Promise(r => setTimeout(r, 300))
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ Done!`)
console.log(`  Countries : ${success}/${COUNTRIES.length}`)
console.log(`  Total     : ${totalChannels.toLocaleString()} channels`)
console.log(`  Saved in  : ${OUTPUT_DIR}`)
