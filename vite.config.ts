import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";

// The engine's JavaScript glue can load its own files relative to import.meta.url when no loader
// is given. Vite would then copy every file next to it (18 MB of wasm and the JDK image) into
// /assets. The site always passes its own loader (engine files come from public/engine, cached),
// so these fallbacks are cut out of the bundle.
function skipEngineSelfLoading(): Plugin {
  const edits: [RegExp, [RegExp, string][]][] = [
    [/engine[\\/]dist[\\/]runner[\\/]runner\.js$/, [[/getCoreModule = \(name\) => fetchCompile\(new URL\(`\.\/\$\{name\}`, import\.meta\.url\)\);/, 'getCoreModule = (name) => { throw new Error("runner: missing core module " + name); };']]],
    [/engine[\\/]dist[\\/]runner[\\/]runner-host\.mjs$/, [[/new URL\(name, import\.meta\.url\)/, "new URL(name, self.location.href)"]]],
    [/engine[\\/]dist[\\/]compiler[\\/]javac-host\.mjs$/, [[/new URL\('\.\/javac\.wasm-runtime\.js', import\.meta\.url\)\.href/, "'./javac.wasm-runtime.js'"]]],
  ];
  return {
    name: "skip-engine-self-loading",
    enforce: "pre",
    transform(code, id) {
      const match = edits.find(([file]) => file.test(id));
      if (!match) return null;
      for (const [pattern, replacement] of match[1]) {
        if (!pattern.test(code)) throw new Error(`skip-engine-self-loading: ${id} changed; update vite.config.ts`);
        code = code.replace(pattern, replacement);
      }
      return code;
    },
  };
}

// Pages live at real paths so each can be indexed. CI sets BASE_PATH to /<repo>/ when
// publishing to a github.io project page.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [skipEngineSelfLoading()],
  worker: { format: "es", plugins: () => [skipEngineSelfLoading()] },
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
