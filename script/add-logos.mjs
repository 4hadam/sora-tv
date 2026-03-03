// Script to add logos to all channels from IPTV.org global M3U
import { readFileSync, writeFileSync } from 'fs'

const FILE_PATH = new URL('../shared/iptv-channels.ts', import.meta.url)
    .pathname.replace(/^\/([A-Z]:)/, '$1')

// Normalize channel name for fuzzy matching
function norm(s) {
    return s.toLowerCase()
        .replace(/\s*\[.*?\]/g, '')    // remove brackets: [Geo-blocked]
        .replace(/\s*\(.*?\)/g, '')    // remove parentheses: (720p)
        .replace(/[^a-z0-9]/g, '')     // keep only alphanumeric
        .trim()
}

// ─── 1. Build logo map from global M3U ────────────────────────────────────────
console.log('📥 Fetching global M3U from IPTV.org (this may take ~15s)...')
const m3uText = await fetch('https://iptv-org.github.io/iptv/index.m3u').then(r => r.text())
// normalize line endings
const m3uLines = m3uText.replace(/\r/g, '').split('\n')
console.log(`✅ Fetched ${m3uLines.length.toLocaleString()} lines`)

// debug: show first line with logo
const debugLine = m3uLines.find(l => l.includes('tvg-logo="http'))
if (debugLine) console.log('Sample:', debugLine.substring(0, 150))

const logoMap = new Map() // normName → logoUrl

for (const line of m3uLines) {
    if (!line.startsWith('#EXTINF')) continue
    const logoMatch = line.match(/tvg-logo="(https?:\/\/[^"]+)"/)
    if (!logoMatch) continue

    // index by display name (after last comma)
    const nameMatch = line.match(/,(.+)$/)
    if (nameMatch) {
        const key = norm(nameMatch[1].trim())
        if (key && !logoMap.has(key)) logoMap.set(key, logoMatch[1])
    }
    // also index by tvg-name attribute
    const tvgNameMatch = line.match(/tvg-name="([^"]+)"/)
    if (tvgNameMatch) {
        if (key && !logoMap.has(key)) logoMap.set(key, logoMatch[1])
    }
}

console.log(`🗺  Built logo map with ${logoMap.size.toLocaleString()} unique entries`)

// ─── 2. Process iptv-channels.ts line by line ─────────────────────────────────
const content = readFileSync(FILE_PATH, 'utf8')
const srcLines = content.split('\n')
const out = []
let updated = 0
let total = 0

for (const line of srcLines) {
    const hasChannelObj = line.includes('"name":') && line.includes('"url":') && line.includes('"category":')
    const alreadyHasLogo = line.includes('"logo":')

    if (hasChannelObj && !alreadyHasLogo) {
        total++
        const nameMatch = line.match(/"name":\s*"([^"]+)"/)
        if (nameMatch) {
            const channelName = nameMatch[1]
            let logo = ''

            // Try 1: exact norm
            logo = logoMap.get(norm(channelName)) || ''

            // Try 2: strip quality suffix then try again
            if (!logo) {
                const stripped = norm(channelName).replace(/(hd|sd|fhd|uhd|1080p|720p|480p|360p|4k)$/, '')
                logo = logoMap.get(stripped) || ''
            }

            // Try 3: strip +1 / +2 suffix
            if (!logo) {
                const stripped = norm(channelName).replace(/\+\d$/, '')
                logo = logoMap.get(stripped) || ''
            }

            if (logo) {
                const newLine = line.replace(/("category":\s*"[^"]*")\s*\}/, `$1, "logo": "${logo}" }`)
                out.push(newLine)
                updated++
                continue
            }
        }
    }
    out.push(line)
}

writeFileSync(FILE_PATH, out.join('\n'), 'utf8')

console.log(`\n✅ Done!`)
console.log(`  Total channel lines : ${total}`)
console.log(`  Updated with logo   : ${updated} (${total ? Math.round(updated / total * 100) : 0}%)`)
console.log(`  Without logo        : ${total - updated}`)
console.log(`  File saved          : ${FILE_PATH}`)
