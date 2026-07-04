import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
      "@components": fileURLToPath(
        new URL("./src/components", import.meta.url)
      ),
      "@domain": fileURLToPath(new URL("./src/domain", import.meta.url)),
      "@hooks": fileURLToPath(new URL("./src/hooks", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
      "@services": fileURLToPath(new URL("./src/services", import.meta.url)),
      "@styles": fileURLToPath(new URL("./src/styles", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
    // react-world-flags ships every country flag inlined in a single ~3.7 MB
    // module that cannot be split further. It is only pulled in by lazy-loaded
    // route chunks, so it never lands in the initial bundle; raise the limit so
    // that unavoidable vendor chunk does not trigger the size warning.
    chunkSizeWarningLimit: 4000,
    rolldownOptions: {
      output: {
        advancedChunks: {
          minSize: 20 * 1024,
          maxSize: 500 * 1024,
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "router",
              test: /node_modules[\\/]@tanstack[\\/]/,
              priority: 25,
            },
            {
              name: "mui",
              test: /node_modules[\\/]@(mui|emotion)[\\/]/,
              priority: 20,
            },
            {
              name: "flags",
              test: /node_modules[\\/]react-world-flags[\\/]/,
              priority: 15,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    css: true,
  },
});
