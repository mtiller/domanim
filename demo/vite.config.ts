import { defineConfig } from "vite";

export default defineConfig({
  server: {
    fs: {
      // Allow serving files from the parent directory (library source + SVG)
      allow: [".."],
    },
  },
});
