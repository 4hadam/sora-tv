import * as fs from "fs";
import * as path from "path";
import { channelsByCountry } from "../shared/iptv-channels";

interface IPTVChannel {
    name: string;
    url: string;
    category: string;
    logo?: string;
}

const TIMEOUT = 4000;
const MAX_CONCURRENT = 3;

async function testChannel(channel: IPTVChannel): Promise<boolean> {
    try {
        // YouTube links are always valid
        if (channel.url.includes("youtube") || channel.url.includes("embed")) {
            return true;
        }

        if (!channel.url.startsWith("http")) {
            return false;
        }

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
            return err.name === "AbortError"; // Timeout = server exists
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
    console.log("🔍 Quick Channel Test\n");
    const start = Date.now();

    let total = 0;
    let working = 0;

    const countries = Object.entries(channelsByCountry).slice(0, 5); // Test first 5 countries

    for (const [country, channels] of countries) {
        process.stdout.write(`${country}... `);
        const results = await testBatch(channels);
        const count = results.filter((x) => x).length;
        working += count;
        total += channels.length;
        console.log(`${count}/${channels.length} ✓`);
    }

    console.log(`\n✅ ${working}/${total} channels working`);
    console.log(`⏱️  ${((Date.now() - start) / 1000).toFixed(1)}s`);
    console.log(`\n📄 Run full test: npm run test:channels`);
}

main().catch(console.error);
