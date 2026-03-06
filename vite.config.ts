import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Don't inject <link rel="modulepreload"> only for truly async heavy chunks
    modulePreload: {
      resolveDependencies: (_filename: string, deps: string[]) =>
        deps.filter((d) =>
          !d.includes('globe') &&
          !d.includes('video')
        ),
    },
    rollupOptions: {
      output: {
        // Prevent Rollup from auto-merging dependencies into manual chunks,
        // which was causing globe imports to pull video stack chunks.
        onlyExplicitManualChunks: true,
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined

          if (
            id.includes("node_modules/globe.gl") ||
            id.includes("node_modules/three")
          ) {
            return "globe-engine"
          }

          if (
            id.includes("node_modules/video.js") ||
            id.includes("node_modules/@videojs/http-streaming") ||
            id.includes("node_modules/hls.js") ||
            id.includes("node_modules/react-player") ||
            id.includes("node_modules/react-youtube") ||
            id.includes("node_modules/mpegts.js")
          ) {
            return "video-stack"
          }

          if (id.includes("node_modules/@tanstack/react-query")) {
            return "query"
          }

          if (
            id.includes("node_modules/@radix-ui/react-dialog") ||
            id.includes("node_modules/@radix-ui/react-dropdown-menu") ||
            id.includes("node_modules/@radix-ui/react-popover") ||
            id.includes("node_modules/@radix-ui/react-select") ||
            id.includes("node_modules/@radix-ui/react-tabs") ||
            id.includes("node_modules/@radix-ui/react-toast")
          ) {
            return "ui-components"
          }

          return undefined
        },
      }
    },
    // ظ£à Optimization settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      }
    },
    sourcemap: false,
    reportCompressedSize: false,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
    ]
  }
});
