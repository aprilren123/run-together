import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: "web",
  plugins: [vue()],
  server: {
    port: 8080,
    // The Commons callback page carries a one-time code in its address, so no page sends a Referer.
    headers: { "Referrer-Policy": "no-referrer" },
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/health": "http://127.0.0.1:3000",
    },
  },
});
