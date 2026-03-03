import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);

// --------------------
// Types
// --------------------
declare module "http" {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

// --------------------
// Middlewares
// --------------------
// Gzip compression for all responses
app.use(compression());

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// --------------------
// Logger
// --------------------
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// --------------------
// Request logger
// --------------------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    capturedJsonResponse = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    log(logLine);
  });

  next();
});

// --------------------
// Bootstrap
// --------------------
async function bootstrap() {
  // Register API routes
  await registerRoutes(httpServer, app);

  // Global error handler
  app.use(
    (err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err?.status || err?.statusCode || 500;
      const message = err?.message || "Internal Server Error";

      console.error("Internal Server Error:", err);

      if (res.headersSent) {
        return next(err);
      }

      res.status(status).json({ message });
    },
  );

  // Static / Vite
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // --------------------
  // Server listen (FIXED)
  // --------------------
  const port = Number(process.env.PORT) || 5000;

  httpServer.listen(port, () => {
    log(`serving on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
