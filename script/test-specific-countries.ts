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

const TIMEOUT = 3000;
const MAX_CONCURRENT = 10;
const COUNTRIES_TO_TEST = ["Morocco", "Spain"]; // المغرب وإسبانيا فقط

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
                    Range: "bytes=0-200",
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
 * ✅ كتابة ملف القنوات المحدثة
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

    content += "};\n\n";

    // Add helper functions
    content += `/**
 * ✅ Helper: Get channels by country name
 */
export function getChannelsByCountry(country: string): IPTVChannel[] {
  return channelsByCountry[country] || [];
}

/**
 * ✅ Helper: Get channels by category
 */
export function getChannelsByCategory(category: string): IPTVChannel[] {
  const channels: IPTVChannel[] = [];
  for (const countryChannels of Object.values(channelsByCountry)) {
    channels.push(
      ...countryChannels.filter((ch) => ch.category === category)
    );
  }
  return channels;
}

/**
 * ✅ Helper: Normalize YouTube URLs to embed format
 */
export function normalizeYouTubeUrl(url: string): string {
  try {
    // If already an embed link, return as is
    if (url.includes("youtube-nocookie.com/embed/") || url.includes("youtube.com/embed/")) {
      return url;
    }
    
    // Extract video ID from various YouTube URL formats
    let videoId: string | null = null;
    
    if (url.includes("youtube.com/watch?v=")) {
      const match = url.match(/watch\\?v=([^&\\s]+)/);
      videoId = match?.[1] || null;
    } else if (url.includes("youtu.be/")) {
      const match = url.match(/youtu\\.be\\/([^\\?&\\s]+)/);
      videoId = match?.[1] || null;
    } else if (url.includes("youtube.com/embed/")) {
      const match = url.match(/embed\\/([^\\?&\\s]+)/);
      videoId = match?.[1] || null;
    }
    
    // Return embed URL if we found a video ID, otherwise return original
    if (videoId) {
      return \`https://www.youtube-nocookie.com/embed/\${videoId}\`;
    }
    
    return url;
  } catch {
    return url;
  }
}\n`;

    return content;
}

/**
 * ✅ البرنامج الرئيسي
 */
async function main() {
    console.log(`⚡ Testing ${COUNTRIES_TO_TEST.join(" & ")}\n`);

    const start = Date.now();

    const cleaned: Record<string, IPTVChannel[]> = {};
    let totalRemoved = 0;
    let totalTested = 0;

    // حفظ الدول الأخرى بدون تعديل
    for (const country of Object.keys(channelsByCountry)) {
        if (!COUNTRIES_TO_TEST.includes(country)) {
            cleaned[country] = channelsByCountry[country];
        }
    }

    // اختبار الدول المحددة فقط
    for (let i = 0; i < COUNTRIES_TO_TEST.length; i++) {
        const country = COUNTRIES_TO_TEST[i];
        const channels = channelsByCountry[country] || [];

        if (channels.length === 0) {
            console.log(`[${i + 1}/${COUNTRIES_TO_TEST.length}] ${country}: لا توجد قنوات`);
            cleaned[country] = [];
            continue;
        }

        process.stdout.write(
            `[${(i + 1)
                .toString()
                .padStart(2)}/${COUNTRIES_TO_TEST.length}] ${country} `
        );

        // اختبار القنوات
        const tests = await runLimited(
            channels,
            MAX_CONCURRENT,
            testChannel
        );

        const working = channels.filter(
            (_, j) => tests[j]
        );

        const removed = channels.length - working.length;
        totalRemoved += removed;
        totalTested += channels.length;

        cleaned[country] = working;

        console.log(
            `${working.length}/${channels.length} (حذف: ${removed})`
        );
    }

    // إنشاء الملف المحدث
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

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ تم الفحص واالتطبيق بنجاح!`);
    console.log(`📊 إجمالي القنوات المختبرة: ${totalTested}`);
    console.log(`🗑️  عدد القنوات المحذوفة: ${totalRemoved}`);
    console.log(`✨ عدد القنوات الشغالة: ${totalTested - totalRemoved}`);
    console.log(`⏱️  الوقت: ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`${'='.repeat(50)}\n`);
}

main().catch(console.error);
