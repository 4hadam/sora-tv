import fs from "fs";
import path from "path";

const baseDir = path.resolve(process.cwd(), "output", "iptv-free-by-category");
const outputPath = path.join(baseDir, "categories.json");

function titleCase(slug) {
  return slug
    .split(/[-_\s]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function parseM3U(text, categoryLabel) {
  const lines = text.replace(/\r/g, "").split("\n");
  const channels = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo=\"([^\"]+)\"/i);
      current = {
        name: nameMatch ? nameMatch[1].trim() : "",
        logo: logoMatch ? logoMatch[1] : "",
        category: categoryLabel,
      };
      continue;
    }

    if (!line.startsWith("#") && current) {
      const url = line;
      if (url) {
        channels.push({
          name: current.name || "Unknown",
          url,
          category: current.category || categoryLabel,
          logo: current.logo || "",
        });
      }
      current = null;
    }
  }

  return channels;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SoraTV/1.0)" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

async function main() {
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Missing directory: ${baseDir}`);
  }

  const files = fs.readdirSync(baseDir).filter((file) => file.endsWith(".m3u"));
  const result = {};

  for (const file of files) {
    const categoryKey = path.basename(file, ".m3u").toLowerCase();
    const categoryLabel = titleCase(categoryKey);
    const playlistUrl = `https://live.iptv-free.com/iptv/categories/${categoryKey}.m3u`;

    console.log(`Fetching ${categoryKey}...`);
    const text = await fetchText(playlistUrl);
    result[categoryKey] = parseM3U(text, categoryLabel);
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
