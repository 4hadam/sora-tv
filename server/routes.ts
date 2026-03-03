import type { Express } from "express";
import { createServer, type Server } from "http";
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

      const response = await fetch(url, { headers });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
      }

      // Pipe the response
      res.status(response.status);
      response.headers.forEach((value, key) => {
        // Skip some headers if needed, or set them all
        res.setHeader(key, value);
      });

      // Explicitly set CORS for the proxy response
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (response.body) {
        // @ts-ignore - native fetch body to node stream
        const reader = response.body.getReader();
        const stream = new ReadableStream({
          start(controller) {
            return pump();
            function pump() {
              return reader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
                return pump();
              });
            }
          }
        });

        // In Node 20+, we can just iterate the body or use arrayBuffer
        // But for simplicity with Express response (which is a stream):
        const arrayBuffer = await response.arrayBuffer();
        res.write(Buffer.from(arrayBuffer));
        res.end();
      } else {
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

  return httpServer;
}
