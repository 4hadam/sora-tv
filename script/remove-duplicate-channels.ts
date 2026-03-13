import fs from "fs";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const filePath = path.resolve(__dirname, "../shared/iptv-channels.ts");
    const fileUrl = pathToFileURL(filePath).href;

    try {
        const mod = await import(fileUrl);
        const channelsByCountry = mod.channelsByCountry as Record<string, any[]>;

        const result: Record<string, any[]> = {};
        let totalBefore = 0;
        let totalAfter = 0;
        let removed = 0;

        for (const [country, channels] of Object.entries(channelsByCountry)) {
            totalBefore += channels.length;
            const seen = new Set<string>();
            const dedup: any[] = [];

            for (const ch of channels) {
                const name = (ch?.name ?? "").toString().trim();
                const url = (ch?.url ?? "").toString().trim();
                const key = `${name}||${url}`;

                if (!seen.has(key)) {
                    seen.add(key);
                    dedup.push(ch);
                } else {
                    removed++;
                }
            }

            result[country] = dedup;
            totalAfter += dedup.length;
        }

        const header = `import { IPTVChannel } from "./schema";\n\nexport const channelsByCountry: Record<string, IPTVChannel[]> = `;
        const fileContent = header + JSON.stringify(result, null, 2) + ";\n";

        // backup original
        const backupPath = filePath + ".bak";
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
        }

        fs.writeFileSync(filePath, fileContent, "utf8");

        console.log(`Dedup complete — before=${totalBefore} after=${totalAfter} removed=${removed}`);
        console.log(`Wrote deduped file to ${filePath} (backup at ${backupPath})`);
    } catch (err) {
        console.error("Failed to dedupe channels:", err);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
