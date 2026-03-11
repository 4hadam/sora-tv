import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { channelsByCountry } from "../shared/iptv-channels";

interface IPTVChannel {
    name: string;
    url: string;
    category: string;
    logo?: string;
}

const TIMEOUT = 3000;
const MAX_CONCURRENT = 5; // Faster parallel testing

async function testChannel(channel: IPTVChannel): Promise<boolean> {
    try {
        if (channel.url.includes("youtube") || channel.url.includes("embed")) {
            return true; // YouTube always valid
        }
        if (!channel.url.startsWith("http")) return false;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        try {
            const response = await fetch(channel.url, {
                method: "HEAD",
                signal: controller.signal,
                headers: { "User-Agent": "Mozilla/5.0" },
            });
            clearTimeout(timeoutId);
            return response.status < 500;
        } catch (err: any) {
            clearTimeout(timeoutId);
            return err.name === "AbortError";
        }
    } catch {
        return false;
    }
}

async function testBatch(channels: IPTVChannel[]): Promise<boolean[]> {
    const results = [];
    for (let i = 0; i < channels.length; i += MAX_CONCURRENT) {
        const batch = channels.slice(i, i + MAX_CONCURRENT);
        const batchResults = await Promise.all(batch.map(testChannel));
        results.push(...batchResults);
    }
    return results;
}

async function main() {
    console.log("🗑️  Cleaning Dead Channels\n");
    const start = Date.now();

    const cleanedChannels: Record<string, IPTVChannel[]> = {};
    let totalRemoved = 0;
    let totalKept = 0;

    const countries = Object.entries(channelsByCountry);

    for (let i = 0; i < countries.length; i++) {
        const [country, channels] = countries[i];
        process.stdout.write(`[${(i + 1).toString().padStart(2)}/${countries.length}] ${country.padEnd(20)}`);

        const testResults = await testBatch(channels);
        const working = channels.filter((_, idx) => testResults[idx]);
        const removed = channels.length - working.length;

        cleanedChannels[country] = working;
        totalRemoved += removed;
        totalKept += working.length;

        console.log(` ${working.length}/${channels.length} (removed ${removed})`);
    }

    // Generate new file
    let content = 'import { IPTVChannel } from "./schema";\n\n';
    content += "export const channelsByCountry: Record<string, IPTVChannel[]> = {\n";

    for (const [country, channels] of Object.entries(cleanedChannels)) {
        content += `  "${country}": [\n`;
        for (const ch of channels) {
            const logo = ch.logo ? `, "logo": "${ch.logo.replace(/"/g, '\\"')}"` : "";
            content += `    { "name": "${ch.name.replace(/"/g, '\\"')}", "url": "${ch.url.replace(/"/g, '\\"')}", "category": "${ch.category.replace(/"/g, '\\"')}"${logo} },\n`;
        }
        content += "  ],\n";
    }

    content += "};\n";

    // Write file
    const filePath = path.join(__dirname, "../shared/iptv-channels.ts");
    fs.writeFileSync(filePath, content);

    const duration = Date.now() - start;

    console.log("\n" + "=".repeat(60));
    console.log("✅ Cleanup Complete!");
    console.log("=".repeat(60));
    console.log(`Total cleaned: ${totalKept}/${totalKept + totalRemoved}`);
    console.log(`Removed:      ${totalRemoved} dead channels`);
    console.log(`Time:         ${(duration / 1000).toFixed(1)}s`);
    console.log(`\n📄 Updated: ${filePath}`);

    // 🔄 Auto-push to GitHub
    try {
        console.log("\n🚀 Pushing to GitHub...");
        if (process.env.AUTO_PUSH === 'true') {
            execSync("git add shared/iptv-channels.ts", { stdio: "inherit" });
            execSync(`git commit -m "🧹 Cleanup: Removed ${totalRemoved} dead channels, kept ${totalKept} working channels"`, { stdio: "inherit" });
            execSync("git push origin main", { stdio: "inherit" });
            console.log("✅ Successfully pushed to GitHub!");
        } else {
            console.log('⚠️ AUTO_PUSH not enabled — skipped git push. Set AUTO_PUSH=true to enable.');
        }
    } catch (error) {
        console.warn("⚠️ Warning: Could not auto-push to GitHub");
        console.warn("   Run manually: git add shared/iptv-channels.ts && git commit -m '...' && git push");
    }
}

main().catch(console.error);
