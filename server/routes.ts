import type { Express } from "express";
import { createServer, type Server } from "http";
import http from "http";
import https from "https";
import { storage } from "./storage";
import { channelsByCountry, getChannelsByCountry, getChannelsByCategory, type IPTVChannel, normalizeYouTubeUrl } from "@shared/iptv-channels";

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

      // CORS headers always
      res.setHeader("Access-Control-Allow-Origin", "*");
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

      if (!category || category === "all-channels" || category === "about" || category.startsWith("faq") || category.startsWith("privacy") || category.startsWith("feedback")) {
        return res.json({ channels: [] });
      }

      let allChannels: IPTVChannel[] = [];
      for (const country in channelsByCountry) {
        // @ts-ignore
        channelsByCountry[country].forEach(channel => {
          allChannels.push({
            ...channel,
            countryName: country,
          });
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
      for (const channels of Object.values(channelsByCountry)) {
        const found = (channels as IPTVChannel[]).find((c) => c.name === name);
        if (found && found.url) {
          return res.json({ url: normalizeYouTubeUrl(found.url) });
        }
      }
      res.status(404).json({ error: "Channel not found" });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  return httpServer;
}
