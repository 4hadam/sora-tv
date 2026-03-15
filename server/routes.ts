import type { Express } from "express";
import { createServer, type Server } from "http";
import http from "http";
import https from "https";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { channelsByCountry } from "@shared/iptv-channels";
import { getChannelsByCountry, getChannelsByCategory, normalizeYouTubeUrl } from "@shared/iptv-helpers";
import type { IPTVChannel } from "@shared/iptv-helpers";

// Simple in-memory rate limiter and host whitelist
const rateLimits: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000); // 1 minute
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60); // requests per window

let iptvFreeCategoryCache: Record<string, IPTVChannel[]> | null = null;
let iptvFreeCategoryMtime = 0;

function loadIptvFreeCategories(): Record<string, IPTVChannel[]> | null {
  try {
    const baseDir = path.resolve(process.cwd(), "output", "iptv-free-by-category");
    const jsonPath = path.join(baseDir, "categories.json");
    if (!fs.existsSync(jsonPath)) return null;

    const stat = fs.statSync(jsonPath);
    if (iptvFreeCategoryCache && stat.mtimeMs === iptvFreeCategoryMtime) {
      return iptvFreeCategoryCache;
    }

    const raw = fs.readFileSync(jsonPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, IPTVChannel[]>;
    iptvFreeCategoryCache = parsed;
    iptvFreeCategoryMtime = stat.mtimeMs;
    return parsed;
  } catch (e) {
    console.error("Failed to load iptv-free categories:", e);
    return null;
  }
}

function clientIpFromReq(req: any) {
  return (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
}

function checkRateLimit(req: any) {
  const ip = clientIpFromReq(req);
  const now = Date.now();
  const rec = rateLimits.get(ip);
  if (!rec || now > rec.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (rec.count >= RATE_LIMIT_MAX) return false;
  rec.count += 1;
  return true;
}

function isHostAllowed(targetUrl: string) {
  const allowed = process.env.ALLOWED_HOSTS; // comma-separated hostnames
  if (!allowed) return true; // no whitelist configured => allow all (default)
  try {
    const parsed = new URL(targetUrl);
    const hosts = allowed.split(",").map(h => h.trim().toLowerCase()).filter(Boolean);
    return hosts.includes(parsed.hostname.toLowerCase());
  } catch (e) {
    return false;
  }
}

// Helper function for channel filtering
function filterChannel(channel: IPTVChannel, category: string | null): boolean {
  if (!category || category === "all-channels" || category === "about" || category.startsWith("faq") || category.startsWith("privacy") || category.startsWith("feedback")) {
    return true;
  }
  if (category === "random-channel") {
    return true;
  }
  const lowerCategory = category.toLowerCase().replace("-", " ");
  const chName = channel.name.toLowerCase();
  const chCategory = channel.category?.toLowerCase();

  if (chCategory === lowerCategory) return true;
  if (chName.includes(lowerCategory)) return true;
  if ((lowerCategory === 'top news' || lowerCategory === 'news') && chCategory === 'news') return true;
  if (lowerCategory === 'movies' && chCategory === 'movies') return true;
  if (lowerCategory === 'music' && chCategory === 'music') return true;
  if ((lowerCategory === 'kids' || lowerCategory === 'animation') && (chCategory === 'kids' || chCategory === 'animation')) return true;
  if (lowerCategory === 'sports' && chCategory === 'sports') return true;

  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Proxy API
  app.get("/api/proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      const key = req.query.key as string;

      if (!url) {
        return res.status(400).json({ error: "Missing 'url' parameter" });
      }

      // Optional API Key check
      const serverKey = process.env.API_KEY;
      if (serverKey && key !== serverKey) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: new URL(url).origin,
        Origin: new URL(url).origin,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      };

      // Rate limit and host whitelist checks
      if (!checkRateLimit(req)) return res.status(429).json({ error: "Rate limit exceeded" });
      if (!isHostAllowed(url)) return res.status(403).json({ error: "Host not allowed" });

      const response = await fetch(url, { headers, redirect: "follow" });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
      }

      const contentType = response.headers.get("content-type") || "";
      const finalUrl = response.url || url;
      const isM3U8 = contentType.includes("mpegurl") ||
        contentType.includes("x-mpegurl") ||
        finalUrl.includes(".m3u8") ||
        finalUrl.includes(".m3u") ||
        url.includes(".m3u8") ||
        url.includes(".m3u");

      // CORS headers (configurable)
      const allowedOrigin = process.env.CORS_ORIGIN || "*";
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (isM3U8) {
        // Rewrite m3u8 so all segment/sub-playlist URLs also go through proxy
        const text = await response.text();
        const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);

        // Also detect m3u8 from content if not already detected
        const looksLikeM3U8 = text.trimStart().startsWith("#EXTM3U") || text.trimStart().startsWith("#EXT");

        if (!looksLikeM3U8) {
          // Not actually m3u8, return as-is
          res.setHeader("Content-Type", contentType || "application/octet-stream");
          res.send(text);
          return;
        }

        const rewritten = text.split("\n").map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) return line;

          // Absolute URL
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
          }
          // Relative URL
          return `/api/proxy?url=${encodeURIComponent(baseUrl + trimmed)}`;
        }).join("\n");

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(rewritten);
      } else {
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        const arrayBuffer = await response.arrayBuffer();
        res.write(Buffer.from(arrayBuffer));
        res.end();
      }

    } catch (err) {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Proxy request failed" });
    }
  });

  // Channels by Category API
  app.get("/api/channels-by-category", async (req, res) => {
    try {
      const category = req.query.category as string;

      if (category && category !== "all-channels") {
        const normalized = category.toLowerCase();
        const alias = normalized === "top-news" ? "news" : normalized;
        const iptvFree = loadIptvFreeCategories();
        if (iptvFree && iptvFree[alias] && iptvFree[alias].length > 0) {
          return res.json({ channels: iptvFree[alias] });
        }
      }

      // Special-case: serve the pre-parsed Movies CSV if available
      if (category && category.toLowerCase() === "movies") {
        try {
          const csvPath = path.resolve(process.cwd(), "output", "movies_parsed.csv");
          if (fs.existsSync(csvPath)) {
            const text = fs.readFileSync(csvPath, "utf8");
            const lines = text.split(/\r?\n/).filter(Boolean);
            const channels: IPTVChannel[] = [];

            for (const ln of lines) {
              const parts = ln.split("|");
              if (parts.length < 2) continue;

              const rawName = (parts[0] || "").trim();
              const url = (parts[1] || "").trim();
              const logo = (parts[2] || "").trim();

              if (!url) continue;

              let name = rawName;
              if (rawName.includes("group-title=") || rawName.includes("tvg-id=") || rawName.includes("#EXTINF")) {
                const lastComma = rawName.lastIndexOf(",");
                if (lastComma !== -1 && lastComma < rawName.length - 1) {
                  name = rawName.slice(lastComma + 1).trim();
                }
              }

              if (!name) continue;

              const ch: IPTVChannel = { name, url, category: "Movies" } as any;
              if (logo) (ch as any).logo = logo;
              channels.push(ch);
            }

            return res.json({ channels });
          }
        } catch (e) {
          console.error("Failed to load movies CSV:", e);
        }
      }

      if (!category || category === "all-channels" || category === "about" || category.startsWith("faq") || category.startsWith("privacy") || category.startsWith("feedback")) {
        return res.json({ channels: [] });
      }

      let allChannels: IPTVChannel[] = [];
      for (const country in channelsByCountry) {
        // @ts-ignore - channels contain plain objects; we add countryName for client use
        channelsByCountry[country].forEach(channel => {
          allChannels.push({ ...(channel as any), countryName: country } as any);
        });
      }

      const normalizedChannels = allChannels.map((ch) => ({
        ...ch,
        url: normalizeYouTubeUrl(ch.url),
      }));

      const filtered = normalizedChannels.filter(ch => filterChannel(ch, category));

      if (category === "random-channel") {
        const randomChannels = filtered.sort(() => 0.5 - Math.random()).slice(0, 40);
        return res.json({ channels: randomChannels });
      }

      res.json({ channels: filtered });

    } catch (error) {
      console.error("Error fetching channels by category:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  // Stream proxy — follows redirects and pipes live MPEG-TS reliably
  app.get("/api/stream", (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).end("Missing url");

    // Rate limit and host whitelist checks
    if (!checkRateLimit(req)) return res.status(429).end("Rate limit exceeded");
    if (!isHostAllowed(url)) return res.status(403).end("Host not allowed");

    let activeReq: http.ClientRequest | null = null;

    const fetchStream = (targetUrl: string, redirectsLeft: number) => {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const transport = isHttps ? https : http;
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf("/") + 1)}`;

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "*/*",
        },
      };

      activeReq = transport.request(options, (proxyRes) => {
        const status = proxyRes.statusCode || 500;

        if ([301, 302, 303, 307, 308].includes(status)) {
          const location = proxyRes.headers.location;
          if (!location || redirectsLeft <= 0) {
            if (!res.headersSent) res.status(502).end("Invalid redirect");
            return;
          }
          const nextUrl = new URL(location, targetUrl).toString();
          proxyRes.resume();
          fetchStream(nextUrl, redirectsLeft - 1);
          return;
        }

        const contentType = `${proxyRes.headers["content-type"] || ""}`;
        const isM3U8 = contentType.includes("mpegurl") ||
          targetUrl.includes(".m3u8") || targetUrl.includes(".m3u");

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache");

        if (isM3U8) {
          res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
          let body = "";
          proxyRes.on("data", (chunk) => body += chunk.toString());
          proxyRes.on("end", () => {
            const rewritten = body.split("\n").map(line => {
              const t = line.trim();
              if (!t || t.startsWith("#")) return line;
              const absUrl = (t.startsWith("http://") || t.startsWith("https://"))
                ? t
                : baseUrl + t;
              return `/api/stream?url=${encodeURIComponent(absUrl)}`;
            }).join("\n");
            if (!res.writableEnded) res.end(rewritten);
          });
        } else {
          res.status(status);
          res.setHeader("Content-Type", contentType || "video/mp2t");
          proxyRes.pipe(res);
        }
      });

      activeReq.on("error", (err) => {
        console.error("Stream proxy error:", err.message);
        if (!res.headersSent) res.status(502).end("Bad gateway");
      });

      activeReq.end();
    };

    req.on("aborted", () => {
      if (activeReq) activeReq.destroy();
    });

    res.on("close", () => {
      if (!res.writableEnded && activeReq) activeReq.destroy();
    });

    fetchStream(url, 6);
  });

  // Channels by Country API — called by the client instead of static 1.7MB bundle
  app.get("/api/channels/:country", async (req, res) => {
    try {
      const country = decodeURIComponent(req.params.country);
      const category = req.query.category as string | undefined;

      let channels: IPTVChannel[] = getChannelsByCountry(country, category);
      channels = channels.map((ch) => ({ ...ch, url: normalizeYouTubeUrl(ch.url || "") }));
      res.json({ channels });
    } catch (error) {
      console.error("Error fetching channels by country:", error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  // Search channel by name across ALL countries
  app.get("/api/channel-search", async (req, res) => {
    try {
      const name = req.query.name as string;
      if (!name) return res.status(400).json({ error: "name required" });
      const q = name.toLowerCase().trim();
      console.log(`[channel-search] query="${name}" q="${q}"`);
      const normalize = (s: string) =>
        s
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      const nq = normalize(q);
      const results: Array<IPTVChannel & { countryName?: string }> = [];
      if (q.length === 0) return res.json({ channels: [] });

      for (const [country, channels] of Object.entries(channelsByCountry)) {
        for (const c of channels as IPTVChannel[]) {
          if (!c.name) continue;
          const nameRaw = c.name;
          const normName = normalize(nameRaw);
          // match either raw substring or normalized substring
          if (nameRaw.toLowerCase().includes(q) || (nq && normName.includes(nq))) {
            results.push({ ...c, countryName: country });
            if (results.length >= 40) break;
          }
        }
        if (results.length >= 40) break;
      }

      if (results.length === 0) {
        console.log(`[channel-search] no matches for q="${q}" nq="${nq}"`);
      } else {
        console.log(`[channel-search] found ${results.length} matches for q="${q}" (sample: ${results.slice(0, 5).map(r => r.name).join(', ')})`);
      }

      const normalized = results.map((ch) => ({
        ...ch,
        url: normalizeYouTubeUrl(ch.url || ""),
      }));

      return res.json({ channels: normalized });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  return httpServer;
}
