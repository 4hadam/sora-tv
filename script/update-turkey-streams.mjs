/**
 * update-turkey-streams.mjs
 * جلب روابط بث تركيا من IPTV-org API وإضافتها للمشروع
 */
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_FILE = path.join(__dirname, "../shared/iptv-channels.ts");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 60000 }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch(e){reject(e);} });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

function mapCategory(cat) {
  if (!cat) return "General";
  const m = { news:"News",entertainment:"Entertainment",music:"Music",sports:"Sports",movies:"Movies",kids:"Kids",documentary:"Documentary",religious:"Religious",general:"General",education:"Education",culture:"Culture",comedy:"Comedy",business:"Business",lifestyle:"Lifestyle",series:"Series",animation:"Animation",cooking:"Cooking",travel:"Travel",auto:"Auto",weather:"Weather",shop:"Shop",science:"Science",legislative:"Legislative",outdoor:"Outdoor",family:"Family",classic:"Classic",relax:"Relax" };
  return m[cat.toLowerCase()] || "General";
}

console.log("📡 جلب البيانات من IPTV-org...");
const [streams, channels] = await Promise.all([
  fetchJson("https://iptv-org.github.io/api/streams.json"),
  fetchJson("https://iptv-org.github.io/api/channels.json"),
]);
console.log("✅ streams:", streams.length, "| channels:", channels.length);

const trStreams = streams.filter(s => s.channel && s.channel.endsWith(".tr") && s.url && s.url.startsWith("http"));
console.log("🇹🇷 روابط تركيا:", trStreams.length);

// أفضل رابط لكل قناة
const streamMap = {};
for (const s of trStreams) {
  const qO = { "1080p":4,"720p":3,"576p":2,"480p":1 };
  if (!streamMap[s.channel] || (qO[s.quality]||0) > (qO[streamMap[s.channel].quality]||0)) {
    streamMap[s.channel] = s;
  }
}

const channelMeta = {};
for (const c of channels) {
  if (c.country === "TR") {
    channelMeta[c.id] = { name: c.name, logo: c.logo||"", category: mapCategory(c.categories?.[0]||"General") };
  }
}
console.log("📺 قنوات TR في channels.json:", Object.keys(channelMeta).length);

let content = fs.readFileSync(CHANNELS_FILE, "utf8");
const blockKey = '"Turkey": [';
const trStart = content.indexOf(blockKey);
if (trStart === -1) { console.error("❌ لم يوجد بلوك Turkey"); process.exit(1); }

const arrayStart = trStart + blockKey.length - 1;
let depth = 0, trEnd = -1;
for (let i = arrayStart; i < content.length; i++) {
  if (content[i]==="[") depth++;
  else if (content[i]==="]") { depth--; if(depth===0){trEnd=i;break;} }
}
if (trEnd === -1) { console.error("❌ لم يوجد نهاية بلوك Turkey"); process.exit(1); }

const existingBlock = content.slice(arrayStart+1, trEnd);
const existingNames = new Set();
for (const m of existingBlock.matchAll(/"name"\s*:\s*"([^"]+)"/g)) existingNames.add(m[1].toLowerCase().trim());
console.log("📋 قنوات موجودة في Turkey:", existingNames.size);

const newChannels = [];
for (const [id, stream] of Object.entries(streamMap)) {
  const meta = channelMeta[id];
  if (!meta) continue;
  if (!existingNames.has(meta.name.toLowerCase().trim())) {
    newChannels.push({ name: meta.name, logo: meta.logo, url: stream.url, quality: stream.quality||"", category: meta.category });
  }
}
console.log("➕ قنوات جديدة:", newChannels.length);
if (newChannels.length === 0) { console.log("ℹ️  لا توجد قنوات جديدة."); process.exit(0); }

const entries = newChannels.map(ch =>
  `    { "name": "${ch.name.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}", "logo": "${ch.logo}", "url": "${ch.url}", "quality": "${ch.quality}", "category": "${ch.category}" }`
).join(",\n");

const beforeEnd = existingBlock.trimEnd();
const comma = beforeEnd.length>0 && !beforeEnd.endsWith(",") ? "," : "";
const newContent = content.slice(0, trEnd) + comma + "\n" + entries + "\n  " + content.slice(trEnd);
fs.writeFileSync(CHANNELS_FILE, newContent, "utf8");

console.log("\n✅ تمت إضافة", newChannels.length, "قناة جديدة لتركيا!");
newChannels.slice(0,10).forEach(ch => console.log(`  • ${ch.name} (${ch.category})`));
