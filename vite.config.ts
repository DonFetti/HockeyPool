import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/nhl": {
        target: "https://api-web.nhle.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nhl/, ""),
      },
      "/api/statsapi": {
        target: "https://statsapi.web.nhl.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/statsapi/, ""),
      },
    },
  },
});
