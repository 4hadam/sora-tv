import fs from "fs";
import path from "path";
import { channelsByCountry } from "../shared/iptv-channels";

type Channel = {
  name: string;
  url: string;
  category?: string;
  logo?: string;
};

const FRANCE = "France";

const replacementMap: Record<string, string> = {
  "KTO": "https://www.ktotv.com/",
  "L'Equipe": "https://www.lequipe.fr/tv/",
  "LCI": "https://www.tf1.fr/lci/direct",
  "6ter (1080p) [Geo-blocked] [Geo-Blocked]": "https://www.m6.fr/6ter/direct",
  "CNews (1080p) [Geo-Blocked]": "https://www.cnews.fr/streaming",
  "France 2 HD (720p) [Geo-Blocked]": "https://www.france.tv/france-2/direct.html",
  "France 3 HD (720p) [Geo-Blocked]": "https://www.france.tv/france-3/direct.html",
  "France 4 HD (720p) [Geo-Blocked]": "https://www.france.tv/france-4/direct.html",
  "France 5 HD (720p) [Geo-Blocked]": "https://www.france.tv/france-5/direct.html",
  "Gulli (720p) [Geo-Blocked]": "https://www.m6.fr/gulli/direct",
  "LCP [Geo-Blocked]": "https://lcp.fr/direct-lcp-5434",
  "M6 [Geo-blocked] [Geo-Blocked]": "https://www.m6.fr/m6/direct",
  "TF1 HD (720p) [Geo-Blocked]": "https://www.tf1.fr/tf1/direct",
  "TF1 Series Films (1080p) [Geo-Blocked]": "https://www.tf1.fr/tf1-series-films/direct",
  "TFX (1080p) [Geo-Blocked]": "https://www.tf1.fr/tfx/direct",
  "TMC HD (1080p) [Geo-Blocked]": "https://www.tf1.fr/tmc/direct",
  "TV78": "https://www.youtube.com/watch?v=VMWGcvWqhjw",
  "viàOccitanie (540p) [Not 24/7]": "https://www.viaoccitanie.tv/direct-tv/",
  "W9 [Geo-blocked] [Geo-Blocked]": "https://www.m6.fr/w9/direct",
};

const brokenNamesToRemove = new Set([
  "100% Docs",
  "Africanews English",
  "L'Effet Papillon",
  "Persiana Emirates",
  "Persiana Latino",
  "Persiana Plus One",
  "Persiana Reality",
  "Persiana Teen",
  "TRACE Latina",
  "Rakuten TV Trailers France",
  "Revry News Europe (Frequency backend)",
  "TRACE Brazuca",
  "Trace Sports Stars",
  "AB1 [Geo-Blocked]",
  "Animaux [Geo-Blocked]",
  "C Star (720p) [Geo-Blocked]",
  "Canal J HD [Geo-Blocked]",
  "Canal+ en clair (720p) [Geo-blocked] [Geo-Blocked]",
  "Mezzo (1080p) [Geo-Blocked]",
  "Museum TV [Geo-blocked]",
  "Nickelodeon",
  "NOVO19 (720p) [Geo-Blocked]",
  "Planete+ (1080p) [Geo-Blocked]",
  "RMC Decouverte (1080p) [Geo-Blocked]",
  "RMC Life [Geo-Blocked]",
  "RMC Story (1080p) [Geo-Blocked]",
  "TéléGohelle",
  "Trek HD (1080p) [Geo-Blocked]",
  "TZiK [Not 24/7]",
  "viàMoselleTV (720p) [Not 24/7]",
  "Wildside TV",
]);

function formatTsFile(data: Record<string, Channel[]>) {
  return `import { IPTVChannel } from "./schema";\n\nexport const channelsByCountry: Record<string, IPTVChannel[]> = ${JSON.stringify(
    data,
    null,
    2,
  )};\n`;
}

function main() {
  const nextData = structuredClone(channelsByCountry) as Record<string, Channel[]>;
  const franceChannels = nextData[FRANCE];

  if (!Array.isArray(franceChannels)) {
    throw new Error("France channel list not found.");
  }

  let removed = 0;
  let replaced = 0;

  nextData[FRANCE] = franceChannels
    .filter((channel) => {
      if (replacementMap[channel.name]) {
        return true;
      }

      if (brokenNamesToRemove.has(channel.name)) {
        removed += 1;
        return false;
      }

      return true;
    })
    .map((channel) => {
      const replacementUrl = replacementMap[channel.name];
      if (!replacementUrl) {
        return channel;
      }

      if (channel.url !== replacementUrl) {
        replaced += 1;
      }

      return {
        ...channel,
        url: replacementUrl,
      };
    });

  const targetFile = path.join(process.cwd(), "shared", "iptv-channels.ts");
  fs.writeFileSync(targetFile, formatTsFile(nextData), "utf8");

  console.log(`France channels updated.`);
  console.log(`Replaced with official links: ${replaced}`);
  console.log(`Removed without official replacement: ${removed}`);
  console.log(`File updated: ${targetFile}`);
}

main();
