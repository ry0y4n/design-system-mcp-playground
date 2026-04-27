import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dsRoot = resolve(here, "../design-system");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@design-system-mcp-playground/design-system/styles": resolve(dsRoot, "src/styles/index.css"),
      "@design-system-mcp-playground/design-system": resolve(dsRoot, "src/index.ts")
    }
  },
  server: {
    fs: {
      // Allow Vite to read files from the design-system package (one level up).
      allow: [resolve(here, ".."), resolve(here, "../..")]
    }
  }
});
