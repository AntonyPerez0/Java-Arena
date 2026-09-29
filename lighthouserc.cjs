// Lighthouse CI on pull requests: scores key pages as a phone would (median of 3 runs).
const base = process.env.BASE_PATH ?? "/";
const origin = "http://127.0.0.1:4173";
module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/serve.mjs",
      startServerReadyPattern: "Serving dist",
      url: [`${origin}${base}`, `${origin}${base}learn/`, `${origin}${base}learn/printing/first-program/`, `${origin}${base}playground/`, `${origin}${base}deathmatch/`, `${origin}${base}bench/`],
      numberOfRuns: 3,
      settings: { chromeFlags: "--no-sandbox --headless=new" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.8, aggregationMethod: "median-run" }],
        "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median-run" }],
        "categories:best-practices": ["error", { minScore: 0.95, aggregationMethod: "median-run" }],
        "categories:seo": ["error", { minScore: 0.95, aggregationMethod: "median-run" }],
        "resource-summary:script:size": ["error", { maxNumericValue: 921600, aggregationMethod: "median" }],
      },
    },
    upload: { target: "filesystem", outputDir: "./lhci" },
  },
};
