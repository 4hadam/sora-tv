// Merge channels from user's file into project file
import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const PROJECT_FILE = new URL('../shared/iptv-channels.ts', import.meta.url)
    .pathname.replace(/^\/([A-Z]:)/, '$1')
const USER_FILE = 'C:/Users/4hada/Downloads/iptv-channels.ts'

// ── Parse a iptv-channels.ts file into: Map<country, Channel[]> ──────────────
function parseChannelsFile(content) {
    const countries = new Map()
    // Match each country block: "CountryName": [ ...channels... ]
    const countryRegex = /"([^"]+)":\s*\[([^\]]*)\]/gs
    let match
    while ((match = countryRegex.exec(content)) !== null) {
        const country = match[1]
        const block = match[2]
        // parse individual channel lines
        const channelRegex = /\{[^}]+\}/g
        const channels = []
        let cm
        while ((cm = channelRegex.exec(block)) !== null) {
            try {
                // convert to valid JSON: replace single quotes if any, ensure keys quoted
                const jsonStr = cm[0]
                    .replace(/'/g, '"')
                    .replace(/(\w+):/g, '"$1":')  // just in case
                // safer: use eval-like approach via Function
                const ch = Function('"use strict"; return (' + cm[0] + ')')()
                if (ch && ch.name && ch.url) channels.push(ch)
            } catch { }
        }
        if (channels.length > 0) countries.set(country, channels)
    }
    return countries
}

// ── Normalize URL for deduplication ──────────────────────────────────────────
function normUrl(u) {
    return (u || '').trim().toLowerCase().replace(/\/$/, '')
}

const projectContent = readFileSync(PROJECT_FILE, 'utf8')
const userContent = readFileSync(USER_FILE, 'utf8')

const projectMap = parseChannelsFile(projectContent)
const userMap = parseChannelsFile(userContent)

console.log(`📂 Project countries: ${projectMap.size}`)
console.log(`📂 User file countries: ${userMap.size}`)

let totalAdded = 0

// For each country in user file, find missing channels
for (const [country, userChannels] of userMap) {
    const projectChannels = projectMap.get(country) || []
    const projectUrls = new Set(projectChannels.map(c => normUrl(c.url)))

    const missing = userChannels.filter(ch => !projectUrls.has(normUrl(ch.url)))

    if (missing.length === 0) continue

    console.log(`  + ${country}: adding ${missing.length} channels`)

    // Build the lines to insert
    const newLines = missing.map(ch => {
        let line = `    { "name": ${JSON.stringify(ch.name)}, "url": ${JSON.stringify(ch.url)}, "category": ${JSON.stringify(ch.category || 'General')}`
        if (ch.logo) line += `, "logo": ${JSON.stringify(ch.logo)}`
        line += ` },`
        return line
    }).join('\n')

    // Find the country block in project file and append before closing ]
    // Match: "Country": [\n ... \n  ],
    const escapedCountry = country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const blockRe = new RegExp(`("${escapedCountry}":\\s*\\[)([\\s\\S]*?)(\\s*\\],)`, 'm')

    const projFile = readFileSync(PROJECT_FILE, 'utf8')
    if (blockRe.test(projFile)) {
        const updated = projFile.replace(blockRe, (_, open, body, close) => {
            // Remove trailing whitespace/newlines from body
            const trimmedBody = body.trimEnd()
            // Add comma to last channel if missing
            const fixedBody = trimmedBody.replace(/\}(\s*)$/, '},')
            return `${open}${fixedBody}\n${newLines}\n  ${close.trim()},`
        })
        writeFileSync(PROJECT_FILE, updated, 'utf8')
        totalAdded += missing.length
    } else {
        console.log(`  ⚠️  Could not find block for "${country}" in project file`)
    }
}

console.log(`\n✅ Done! Added ${totalAdded} missing channels to project file.`)
