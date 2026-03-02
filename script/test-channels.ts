import * as fs from "fs";
import * as path from "path";
import { channelsByCountry } from "../shared/iptv-channels";

interface IPTVChannel {
    name: string;
    url: string;
    category: string;
    logo?: string;
}

interface TestResult {
    country: string;
    total: number;
    working: number;
    failed: number;
    percent: number;
    time: number;
}

const TIMEOUT = 4000;
const MAX_CONCURRENT = 3;

async function testChannel(channel: IPTVChannel): Promise<boolean> {
    try {
        if (channel.url.includes("youtube") || channel.url.includes("embed")) {
            return true;
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

async function testAll(): Promise<void> {
    console.log("🔍 Full Channel Test\n");
    const start = Date.now();
    const results: TestResult[] = [];

    let totalCh = 0;
    let workingCh = 0;

    const countries = Object.entries(channelsByCountry);
    console.log(`Testing ${countries.length} countries...\n`);

    for (let i = 0; i < countries.length; i++) {
        const [country, channels] = countries[i];
        process.stdout.write(
            `[${i + 1}/${countries.length}] ${country.padEnd(20)}`
        );

        const t0 = Date.now();
        const testResults = await testBatch(channels);
        const time = Date.now() - t0;

        const count = testResults.filter((x) => x).length;
        const percent = Math.round((count / channels.length) * 100);

        results.push({
            country,
            total: channels.length,
            working: count,
            failed: channels.length - count,
            percent,
            time,
        });

        workingCh += count;
        totalCh += channels.length;

        console.log(` ${count}/${channels.length} (${percent}%) ✓`);
    }

    const duration = Date.now() - start;

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total:   ${totalCh}`);
    console.log(`Working: ${workingCh} (${Math.round((workingCh / totalCh) * 100)}%)`);
    console.log(`Failed:  ${totalCh - workingCh}`);
    console.log(`Time:    ${(duration / 1000).toFixed(1)}s`);

    // Save report
    const reportPath = path.join(__dirname, "../channel-test-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Report: ${reportPath}`);
}

async function cleanup(): Promise<void> {
    console.log("🗑️  Cleaning Channels\n");

    const cleanedChannels: Record<string, IPTVChannel[]> = {};
    let removedTotal = 0;

    const countries = Object.entries(channelsByCountry);

    for (let i = 0; i < countries.length; i++) {
        const [country, channels] = countries[i];
        process.stdout.write(`[${i + 1}/${countries.length}] ${country}... `);

        const testResults = await testBatch(channels);
        const working = channels.filter((_, idx) => testResults[idx]);

        cleanedChannels[country] = working;
        removedTotal += channels.length - working.length;

        console.log(
            `${working.length}/${channels.length} (removed ${channels.length - working.length
            })`
        );
    }

    // Generate new file content
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

    console.log(`\n✅ Updated: ${filePath}`);
    console.log(`   Removed: ${removedTotal} dead channels`);
}

const args = process.argv.slice(2);
if (args.includes("--cleanup")) {
    cleanup();
} else {
    testAll();
    console.log("\n💡 Remove dead channels: npm run test:channels:cleanup\n");
}
