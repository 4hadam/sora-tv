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
    // Never inject <link rel="modulepreload"> for heavy 3D / video chunks
    modulePreload: {
      resolveDependencies: (_filename: string, deps: string[]) =>
        deps.filter((d) =>
          !d.includes('video') &&
          !d.includes('three') &&
          !d.includes('globe') &&
          !d.includes('mpegts')
        ),
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy 3D — isolated so they never block initial parse
          'three-core': ['three'],
          'globe-gl': ['globe.gl'],
          // Video player
          'video-player': ['video.js', '@videojs/http-streaming', 'hls.js'],
          // iptv-channels.ts is now server-only — not in client bundle
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          'query': ['@tanstack/react-query'],
        }
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
