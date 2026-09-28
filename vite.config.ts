import { defineConfig } from "vite";
import { resolve } from "node:path";

// Pages live at real paths so each can be indexed. CI sets BASE_PATH to /<repo>/ when
// publishing to a github.io project page.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  worker: { format: "es" },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        bench: resolve(__dirname, "bench/index.html"),
        harness: resolve(__dirname, "harness/index.html"),
      },
    },
  },
  server: { fs: { allow: ["."] } },
});
