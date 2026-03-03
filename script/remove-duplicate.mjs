import { readFileSync, writeFileSync } from 'fs'

const FILE = new URL('../shared/iptv-channels.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

let content = readFileSync(FILE, 'utf8')
const beforeLines = content.split('\n').length

// Find the duplicate "United States of America": [ block
const blockStart = content.indexOf('\n  "United States of America": [')
if (blockStart === -1) {
    console.log('Block not found - already removed or different format')
    process.exit(0)
}

// Find closing ], by counting bracket depth
let depth = 0
let i = blockStart + 1
let foundOpen = false

while (i < content.length) {
    if (content[i] === '[') { depth++; foundOpen = true }
    if (content[i] === ']') { depth-- }
    if (foundOpen && depth === 0) { i++; break }
    i++
}

// Skip trailing comma and newline
while (i < content.length && (content[i] === ',' || content[i] === '\r' || content[i] === '\n')) {
    i++
}
// Go back one to keep the newline before next section
i--

const newContent = content.substring(0, blockStart) + content.substring(i)
writeFileSync(FILE, newContent, 'utf8')

const afterLines = newContent.split('\n').length
console.log(`✅ Removed "United States of America" duplicate block`)
console.log(`   Lines before: ${beforeLines}`)
console.log(`   Lines after:  ${afterLines}`)
console.log(`   Lines removed: ${beforeLines - afterLines}`)
