import fs from "fs";
import path from "path";
import { channelsByCountry } from "../shared/iptv-channels";

type ChannelRecord = {
  name: string;
  url: string;
  category?: string;
  logo?: string;
  [key: string]: unknown;
};

type ProbeStatus = "ok" | "broken" | "skipped";

type ProbeResult = {
  country: string;
  channel: string;
  url: string;
  status: ProbeStatus;
  httpStatus?: number;
  method?: "HEAD" | "GET" | "SKIP";
  reason: string;
};

type Options = {
  country?: string;
  categories?: string[];
  categoryFile?: string;
  cleanup: boolean;
  timeoutMs: number;
  concurrency: number;
  limit?: number;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    cleanup: argv.includes("--cleanup"),
    timeoutMs: 6000,
    concurrency: 8,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--country" && next) {
      options.country = next;
      i += 1;
      continue;
    }

    if (arg === "--category" && next) {
      const parts = next
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        options.categories = [...(options.categories ?? []), ...parts];
      }
      i += 1;
      continue;
    }

    if (arg === "--category-file" && next) {
      options.categoryFile = next;
      i += 1;
      continue;
    }

    if (arg === "--timeout" && next) {
      options.timeoutMs = Number(next) || options.timeoutMs;
      i += 1;
      continue;
    }

    if (arg === "--concurrency" && next) {
      options.concurrency = Math.max(1, Number(next) || options.concurrency);
      i += 1;
      continue;
    }

    if (arg === "--limit" && next) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      i += 1;
    }
  }

  return options;
}

function isYouTubeLike(url: string): boolean {
  const value = url.toLowerCase();
  return (
    value.includes("youtube.com") ||
    value.includes("youtu.be") ||
    value.includes("youtube-nocookie.com") ||
    value.includes("/embed/")
  );
}

function normalizeCountryName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeCategoryName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function channelMatchesCategory(channel: ChannelRecord, categories: string[]): boolean {
  const raw = typeof channel.category === "string" ? channel.category : "";
  if (!raw) return false;
  const channelParts = raw.split(";").map((part) => normalizeCategoryName(part));
  return categories.some((category) => channelParts.includes(normalizeCategoryName(category)));
}

let categoryFileCache: Record<string, ChannelRecord[]> | null = null;

function loadCategoryFile(filePath: string): Record<string, ChannelRecord[]> {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as Record<string, ChannelRecord[]>;
}

function withTimeout(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

async function headRequest(url: string, timeoutMs: number) {
  const controller = withTimeout(timeoutMs);
  return fetch(url, {
    method: "HEAD",
    redirect: "follow",
    signal: controller.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SoraTVChannelHealth/1.0)",
    },
  });
}

async function getRequest(url: string, timeoutMs: number) {
  const controller = withTimeout(timeoutMs);
  return fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: controller.signal,
    headers: {
      Range: "bytes=0-2048",
      "User-Agent": "Mozilla/5.0 (compatible; SoraTVChannelHealth/1.0)",
    },
  });
}

async function probeChannel(country: string, channel: ChannelRecord, timeoutMs: number): Promise<ProbeResult> {
  if (!channel.url || typeof channel.url !== "string") {
    return {
      country,
      channel: channel.name,
      url: "",
      status: "broken",
      method: "SKIP",
      reason: "Missing URL",
    };
  }

  if (isYouTubeLike(channel.url)) {
    return {
      country,
      channel: channel.name,
      url: channel.url,
      status: "skipped",
      method: "SKIP",
      reason: "Skipped embedded/YouTube source",
    };
  }

  if (!/^https?:\/\//i.test(channel.url)) {
    return {
      country,
      channel: channel.name,
      url: channel.url,
      status: "broken",
      method: "SKIP",
      reason: "Unsupported URL scheme",
    };
  }

  try {
    const head = await headRequest(channel.url, timeoutMs);

    if (head.ok) {
      return {
        country,
        channel: channel.name,
        url: channel.url,
        status: "ok",
        method: "HEAD",
        httpStatus: head.status,
        reason: "HEAD request succeeded",
      };
    }

    if (head.status >= 500) {
      return {
        country,
        channel: channel.name,
        url: channel.url,
        status: "broken",
        method: "HEAD",
        httpStatus: head.status,
        reason: "HEAD returned server error",
      };
    }
  } catch {
    // Some providers block HEAD; fall back to GET below.
  }

  try {
    const response = await getRequest(channel.url, timeoutMs);
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const text = await response.text().catch(() => "");
    const looksHls =
      channel.url.toLowerCase().includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      text.includes("#EXTM3U");
    const looksDash =
      channel.url.toLowerCase().includes(".mpd") ||
      contentType.includes("dash+xml") ||
      text.includes("<MPD");
    const looksPlayable =
      looksHls ||
      looksDash ||
      contentType.startsWith("video/") ||
      contentType.startsWith("audio/");

    if (response.ok && looksPlayable) {
      return {
        country,
        channel: channel.name,
        url: channel.url,
        status: "ok",
        method: "GET",
        httpStatus: response.status,
        reason: "Playable manifest/media response detected",
      };
    }

    return {
      country,
      channel: channel.name,
      url: channel.url,
      status: "broken",
      method: "GET",
      httpStatus: response.status,
      reason: looksPlayable ? "Unexpected response body" : "No playable manifest detected",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network failure";
    return {
      country,
      channel: channel.name,
      url: channel.url,
      status: "broken",
      method: "GET",
      reason,
    };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function consume() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => consume());
  await Promise.all(workers);
  return results;
}

function buildTargets(options: Options) {
  if (options.categoryFile) {
    const resolved = path.resolve(process.cwd(), options.categoryFile);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Category file not found: ${resolved}`);
    }

    const data = loadCategoryFile(resolved);
    categoryFileCache = data;

    const availableKeys = Object.keys(data);
    const desired = options.categories?.map((cat) => normalizeCategoryName(cat));
    const keys = desired && desired.length > 0
      ? availableKeys.filter((key) => desired.includes(normalizeCategoryName(key)))
      : availableKeys;

    if (keys.length === 0) {
      throw new Error("No matching categories found in category file.");
    }

    return keys.map((key) => {
      let channels = data[key] || [];
      if (typeof options.limit === "number") {
        channels = channels.slice(0, options.limit);
      }
      return { country: key, channels };
    });
  }

  const entries = Object.entries(channelsByCountry as Record<string, ChannelRecord[]>);
  const filtered = options.country
    ? entries.filter(([country]) => normalizeCountryName(country) === normalizeCountryName(options.country!))
    : entries;

  if (filtered.length === 0) {
    throw new Error(`Country not found: ${options.country}`);
  }

  const normalizedCategories = options.categories?.map((cat) => normalizeCategoryName(cat));

  return filtered.map(([country, channels]) => {
    let nextChannels = channels;
    if (normalizedCategories && normalizedCategories.length > 0) {
      nextChannels = channels.filter((channel) => channelMatchesCategory(channel, normalizedCategories));
    }
    if (typeof options.limit === "number") {
      nextChannels = nextChannels.slice(0, options.limit);
    }
    return { country, channels: nextChannels };
  });
}

function formatTsFile(data: Record<string, ChannelRecord[]>) {
  return `import { IPTVChannel } from "./schema";\n\nexport const channelsByCountry: Record<string, IPTVChannel[]> = ${JSON.stringify(
    data,
    null,
    2,
  )};\n`;
}

function writeReport(results: ProbeResult[]) {
  const reportsDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportsDir, `channel-health-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf8");
  return reportPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = buildTargets(options);
  const flatTargets = targets.flatMap(({ country, channels }) =>
    channels.map((channel) => ({ country, channel })),
  );

  console.log("Channel health check");
  const scopeParts = [];
  scopeParts.push(options.country ?? "all countries");
  if (options.categories && options.categories.length > 0) {
    scopeParts.push(`categories: ${options.categories.join(", ")}`);
  }
  if (options.categoryFile) {
    scopeParts.push(`category file: ${options.categoryFile}`);
  }
  console.log(`Scope: ${scopeParts.join(" | ")}`);
  console.log(`Channels queued: ${flatTargets.length}`);
  console.log(`Concurrency: ${options.concurrency}`);
  console.log(`Cleanup mode: ${options.cleanup ? "enabled" : "disabled"}`);
  console.log("");

  const results = await runWithConcurrency(flatTargets, options.concurrency, async ({ country, channel }, index) => {
    const result = await probeChannel(country, channel, options.timeoutMs);
    const marker =
      result.status === "ok" ? "OK " : result.status === "broken" ? "BAD" : "SKP";
    console.log(
      `[${String(index + 1).padStart(4, "0")}/${flatTargets.length}] ${marker} ${country} :: ${channel.name} :: ${result.reason}`,
    );
    return result;
  });

  const okCount = results.filter((item) => item.status === "ok").length;
  const broken = results.filter((item) => item.status === "broken");
  const skipped = results.filter((item) => item.status === "skipped").length;

  const reportPath = writeReport(results);

  console.log("");
  console.log(`Healthy: ${okCount}`);
  console.log(`Broken: ${broken.length}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Report: ${reportPath}`);

  if (!options.cleanup) {
    console.log("");
    console.log("No file changes made. Re-run with --cleanup to remove broken links from the checked scope.");
    return;
  }

  if (broken.length === 0) {
    console.log("");
    console.log("Cleanup skipped: no broken channels found.");
    return;
  }

  const brokenUrls = new Set(broken.map((item) => `${item.country}::${item.url}`));
  if (options.categoryFile && categoryFileCache) {
    const resolved = path.resolve(process.cwd(), options.categoryFile);
    const desired = options.categories?.map((cat) => normalizeCategoryName(cat));
    const nextData: Record<string, ChannelRecord[]> = {};

    for (const [category, channels] of Object.entries(categoryFileCache)) {
      const shouldMutateCategory =
        !desired || desired.length === 0 || desired.includes(normalizeCategoryName(category));
      nextData[category] = shouldMutateCategory
        ? channels.filter((channel) => !brokenUrls.has(`${category}::${channel.url}`))
        : channels;
    }

    fs.writeFileSync(resolved, JSON.stringify(nextData, null, 2), "utf8");
    console.log("");
    console.log(`Removed broken channels from ${resolved}`);
    console.log("Review the JSON report before committing changes.");
    return;
  }

  const nextData: Record<string, ChannelRecord[]> = {};

  for (const [country, channels] of Object.entries(channelsByCountry as Record<string, ChannelRecord[]>)) {
    const shouldMutateCountry =
      !options.country || normalizeCountryName(country) === normalizeCountryName(options.country);

    nextData[country] = shouldMutateCountry
      ? channels.filter((channel) => !brokenUrls.has(`${country}::${channel.url}`))
      : channels;
  }

  const targetFile = path.join(process.cwd(), "shared", "iptv-channels.ts");
  fs.writeFileSync(targetFile, formatTsFile(nextData), "utf8");

  console.log("");
  console.log(`Removed broken channels from ${targetFile}`);
  console.log("Review the JSON report before committing changes.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
