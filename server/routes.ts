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

  // Football Channels API — uses IPTV_CREDS env var to protect credentials
  app.get("/api/football", async (req, res) => {
    const creds = process.env.IPTV_CREDS;
    if (!creds) {
      return res.status(503).json({ error: "Football channels not configured" });
    }
    const base = `http://ugeen.live:8080/${creds}`;
    const channels = [
      // ── beIN SPORTS HD ──────────────────────────────
      { name: "beIN SPORTS 1 HD", id: 46, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 2 HD", id: 47, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 3 HD", id: 49, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 4 HD", id: 50, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 5 HD", id: 51, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 6 HD", id: 52, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 7 HD", id: 53, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 8 HD", id: 54, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS 9 HD", id: 4034, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      // ── beIN Full HD ────────────────────────────────
      { name: "beIN SPORTS Full HD 1", id: 3221, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS Full HD 2", id: 3222, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS Full HD 3", id: 3224, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN SPORTS Full HD 4", id: 3225, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      { name: "beIN Sport Global", id: 4336, logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/BeIN_Sports_logo_2017.svg/200px-BeIN_Sports_logo_2017.svg.png" },
      // ── Alwan Sport ─────────────────────────────────
      { name: "Alwan Sport 1 FHD", id: 4399, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alwan Sport 2 FHD", id: 4400, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alwan Sport 3 FHD", id: 4401, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alwan Sport 4 FHD", id: 4402, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alwan Sport 5 FHD", id: 4418, logo: "https://i.imgur.com/0sNWg54.png" },
      // ── Thamanya (Serie A) ───────────────────────────
      { name: "Thamanya Sports 1", id: 4119, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Thamanya Sports 2", id: 4120, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Thamanya Sports 3", id: 4239, logo: "https://i.imgur.com/0sNWg54.png" },
      // ── Shahid Sport ────────────────────────────────
      { name: "Shahid Sport 1 HD", id: 4462, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Shahid Sport 2 HD", id: 4463, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Shahid Sport 3 HD", id: 4464, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Shahid Sport 4 HD", id: 4465, logo: "https://i.imgur.com/0sNWg54.png" },
      // ── Arab Sports ─────────────────────────────────
      { name: "KSA Sports 1", id: 2053, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "KSA Sports 2", id: 2054, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "KSA Sports 3", id: 2055, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "KSA Sport 4", id: 2056, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Dubai Sports 1 HD", id: 4038, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Dubai Sports 2 HD", id: 4093, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "AD Sport 1", id: 112, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "AD Sport 2", id: 113, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alkass 1", id: 1461, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alkass 2", id: 1462, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alkass 3", id: 1463, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Alkass 4", id: 1464, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Jordan Sport", id: 4362, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Starz Play SPORT 1", id: 4040, logo: "https://i.imgur.com/0sNWg54.png" },
      { name: "Starz Play SPORT 2", id: 4041, logo: "https://i.imgur.com/0sNWg54.png" },
    ].map(ch => ({
      name: ch.name,
      url: `${base}/${ch.id}.m3u8`,
      logo: ch.logo,
      category: "Sports",
    }));
    res.json({ channels });
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
