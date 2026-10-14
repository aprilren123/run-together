import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The backend Vite forwards /api to; BACKEND_URL lets a second copy run beside `bun run dev`.
const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  root: "web",
  plugins: [vue()],
  server: {
    port: 8080,
    // The Commons callback page carries a one-time code in its address, so no page sends a Referer.
    headers: { "Referrer-Policy": "no-referrer" },
    proxy: {
      "/api": backend,
      "/health": backend,
    },
  },
});
