import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { channelsByCountry } from "../shared/iptv-channels";

interface IPTVChannel {
    name: string;
    url: string;
    category: string;
    logo?: string;
}

const TIMEOUT = 2000;
const MAX_CONCURRENT = 10;

async function testChannel(ch: IPTVChannel): Promise<boolean> {
    try {
        if (ch.url.includes("youtube") || ch.url.includes("embed")) return true;
        if (!ch.url.startsWith("http")) return false;

        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), TIMEOUT);

        try {
            const res = await fetch(ch.url, {
                method: "HEAD",
                signal: ctrl.signal,
                headers: { "User-Agent": "Mozilla/5.0" },
            });
            clearTimeout(tid);
            return res.status < 500;
        } catch (e: any) {
            clearTimeout(tid);
            return e.name === "AbortError";
        }
    } catch {
        return false;
    }
}

async function main() {
    console.log("⚡ Cleaning Channels\n");
    const start = Date.now();
    const cleaned: Record<string, IPTVChannel[]> = {};
    let removed = 0;

    const countries = Object.entries(channelsByCountry);

    for (let i = 0; i < countries.length; i++) {
        const [country, channels] = countries[i];
        process.stdout.write(`[${(i + 1).toString().padStart(2)}/${countries.length}] ${country} `);

        const tests = await Promise.all(channels.map(testChannel));
        const working = channels.filter((_, j) => tests[j]);
        const cnt = channels.length - working.length;

        cleaned[country] = working;
        removed += cnt;

        console.log(`${working.length}/${channels.length}`);
    }

    // Write file
    let content = 'import { IPTVChannel } from "./schema";\n\n';
    content += 'export const channelsByCountry: Record<string, IPTVChannel[]> = {\n';

    for (const [country, channels] of Object.entries(cleaned)) {
        content += `  "${country}": [\n`;
        for (const ch of channels) {
            const name = (ch.name || "").replace(/"/g, '\\"');
            const url = (ch.url || "").replace(/"/g, '\\"');
            const cat = (ch.category || "").replace(/"/g, '\\"');
            const logo = (ch.logo || "") ? `, "logo": "${(ch.logo || "").replace(/"/g, '\\"')}"` : "";
            content += `    { "name": "${name}", "url": "${url}", "category": "${cat}"${logo} },\n`;
        }
        content += `  ],\n`;
    }
    content += `};\n`;

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const fpath = path.join(__dirname, "../shared/iptv-channels.ts");
    fs.writeFileSync(fpath, content);

    const t = Date.now() - start;
    console.log(`\n✅ Cleaned: Removed ${removed} dead channels\n`);
    console.log(`⏱️  ${(t / 1000).toFixed(1)}s\n`);
}

main().catch(console.error);

main().catch(console.error);
