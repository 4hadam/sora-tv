# Replace Turkey section in iptv-channels.ts with iptv-org data
$lines = [System.IO.File]::ReadAllLines((Resolve-Path "output\turkey_iptv_org.m3u"), [System.Text.Encoding]::UTF8)
$channels = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^#EXTINF') {
        $extinf = $lines[$i]
        $url = ""
        for ($j = $i+1; $j -lt $lines.Count -and $j -lt ($i+5); $j++) {
            if ($lines[$j] -match '^https?://') {
                $url = $lines[$j].Trim()
                break
            }
        }
        if ($url -ne "") {
            $name = ""
            if ($extinf -match 'tvg-name="([^"]*)"') { $name = $Matches[1] }
            elseif ($extinf -match ',(.+)$') { $name = $Matches[1].Trim() }
            $name = $name -replace " \(\d+p\)", "" -replace " \[Not 24/7\]", ""
            # Fix garbled Turkish characters (encoding issue in source)
            $name = $name.Trim()

            $logo = ""
            if ($extinf -match 'tvg-logo="([^"]*)"') { $logo = $Matches[1] }

            $group = "General"
            if ($extinf -match 'group-title="([^"]*)"') { $group = $Matches[1] }

            # Map iptv-org categories to our categories
            $category = switch -Wildcard ($group.ToLower()) {
                "*news*"        { "News" }
                "*haber*"       { "News" }
                "*sport*"       { "Sports" }
                "*spor*"        { "Sports" }
                "*entertain*"   { "Entertainment" }
                "*eglen*"       { "Entertainment" }
                "*music*"       { "Music" }
                "*muzik*"       { "Music" }
                "*müzik*"       { "Music" }
                "*kids*"        { "Kids" }
                "*cocuk*"       { "Kids" }
                "*çocuk*"       { "Kids" }
                "*movie*"       { "Movies" }
                "*film*"        { "Movies" }
                "*doc*"         { "Documentary" }
                "*belgesel*"    { "Documentary" }
                default         { "General" }
            }

            $channels += [PSCustomObject]@{
                name     = $name
                url      = $url
                logo     = $logo
                category = $category
            }
        }
    }
}

Write-Host "Parsed $($channels.Count) Turkey channels"

# Build TypeScript block
$tsLines = @()
$tsLines += '  "Turkey": ['
foreach ($ch in $channels) {
    $nameEsc = $ch.name -replace '\\', '\\' -replace '"', '\"'
    $urlEsc  = $ch.url.Trim()
    $logoVal = if ($ch.logo -ne "") { '"' + $ch.logo + '"' } else { '""' }
    $tsLines += "    { name: `"$nameEsc`", url: `"$urlEsc`", category: `"$($ch.category)`", logo: $logoVal },"
}
$tsLines += "  ],"

# Write to temp file for inspection
[System.IO.File]::WriteAllLines((Resolve-Path "output" | Join-Path -ChildPath "turkey_ts_block.txt"), $tsLines, [System.Text.Encoding]::UTF8)
Write-Host "TypeScript block written to output\turkey_ts_block.txt"
Write-Host "Lines: $($tsLines.Count)"

# ===== Replace Turkey section in iptv-channels.ts =====
Write-Host "Reading iptv-channels.ts..."
$mainContent = [System.IO.File]::ReadAllText((Resolve-Path "shared\iptv-channels.ts"), [System.Text.Encoding]::UTF8)

$startIdx = $mainContent.IndexOf('"Turkey": [')
if ($startIdx -eq -1) { Write-Error "Turkey section not found!"; exit 1 }

# Find closing ] of Turkey array
$depth = 0
$endIdx = -1
for ($i = $startIdx + 11; $i -lt $mainContent.Length; $i++) {
    $c = $mainContent[$i]
    if ($c -eq '[') { $depth++ }
    elseif ($c -eq ']') {
        if ($depth -eq 0) { $endIdx = $i; break }
        $depth--
    }
}
Write-Host "Turkey section: chars $startIdx to $endIdx"

# Build the new block string (trimmed closing comma -> just "]")
$newBlock = ($tsLines -join "`n").TrimEnd()
if ($newBlock.EndsWith("],")) { $newBlock = $newBlock.Substring(0, $newBlock.Length - 1) }

# Splice into main content
$before = $mainContent.Substring(0, $startIdx)
$after  = $mainContent.Substring($endIdx + 1)
$newContent = $before + $newBlock + $after

[System.IO.File]::WriteAllText((Resolve-Path "shared\iptv-channels.ts"), $newContent, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Done! Replaced Turkey section with $($channels.Count) channels"
