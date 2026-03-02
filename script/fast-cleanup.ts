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

const TIMEOUT = 3000;          // مهلة الفحص
const MAX_CONCURRENT = 10;     // عدد الفحوصات المتزامنة

/**
 * ✅ اختبار قناة IPTV
 */
async function testChannel(ch: IPTVChannel): Promise<boolean> {
    try {
        // روابط embed / youtube نعتبرها صالحة
        if (ch.url.includes("youtube") || ch.url.includes("embed")) {
            return true;
        }

        if (!ch.url.startsWith("http")) return false;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

        try {
            // بعض IPTV لا يدعم HEAD لذلك نستعمل GET جزئي
            const res = await fetch(ch.url, {
                method: "GET",
                signal: ctrl.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    Range: "bytes=0-200", // تحميل بسيط فقط
                },
            });

            clearTimeout(timer);

            // أقل من 500 يعني السيرفر يرد
            return res.status < 500;
        } catch (err: any) {
            clearTimeout(timer);

            // timeout أو خطأ شبكة = غير صالح
            if (err?.name === "AbortError") {
                return false;
            }

            return false;
        }
    } catch {
        return false;
    }
}

/**
 * ✅ limiter لتحديد عدد الطلبات المتزامنة
 */
async function runLimited<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    async function runner() {
        while (true) {
            const current = nextIndex++;
            if (current >= items.length) break;

            results[current] = await worker(items[current], current);
        }
    }

    const workers = Array.from(
        { length: Math.min(limit, items.length) },
        () => runner()
    );

    await Promise.all(workers);

    return results;
}

/**
 * ✅ كتابة ملف القنوات
 */
function buildOutputFile(
    cleaned: Record<string, IPTVChannel[]>
): string {
    let content =
        'import { IPTVChannel } from "./schema";\n\n';

    content +=
        "export const channelsByCountry: Record<string, IPTVChannel[]> = {\n";

    for (const [country, channels] of Object.entries(cleaned)) {
        content += `  "${country}": [\n`;

        for (const ch of channels) {
            const name = (ch.name ?? "").replace(/"/g, '\\"');
            const url = (ch.url ?? "").replace(/"/g, '\\"');
            const cat = (ch.category ?? "").replace(/"/g, '\\"');

            const logo =
                ch.logo && ch.logo.length
                    ? `, "logo": "${ch.logo.replace(/"/g, '\\"')}"`
                    : "";

            content += `    { "name": "${name}", "url": "${url}", "category": "${cat}"${logo} },\n`;
        }

        content += "  ],\n";
    }

    content += "};\n";

    return content;
}

/**
 * ✅ البرنامج الرئيسي
 */
async function main() {
    console.log("⚡ Cleaning Channels\n");

    const start = Date.now();

    const cleaned: Record<string, IPTVChannel[]> = {};
    let removed = 0;

    const countries = Object.entries(channelsByCountry);

    for (let i = 0; i < countries.length; i++) {
        const [country, channels] = countries[i];

        process.stdout.write(
            `[${(i + 1)
                .toString()
                .padStart(2)}/${countries.length}] ${country} `
        );

        // limiter بدل Promise.all
        const tests = await runLimited(
            channels,
            MAX_CONCURRENT,
            testChannel
        );

        const working = channels.filter(
            (_, j) => tests[j]
        );

        const cnt = channels.length - working.length;

        cleaned[country] = working;
        removed += cnt;

        console.log(
            `${working.length}/${channels.length}`
        );
    }

    // إنشاء الملف
    const content = buildOutputFile(cleaned);

    const __dirname = path.dirname(
        fileURLToPath(import.meta.url)
    );

    const fpath = path.join(
        __dirname,
        "../shared/iptv-channels.ts"
    );

    fs.writeFileSync(fpath, content, "utf8");

    const elapsed = Date.now() - start;

    console.log(
        `\n✅ Cleaned: Removed ${removed} dead channels`
    );

    console.log(
        `⏱️ ${(elapsed / 1000).toFixed(1)}s\n`
    );
}

main().catch(console.error);

main().catch(console.error);
