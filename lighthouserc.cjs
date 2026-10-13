// Lighthouse CI on pull requests: scores key pages as a phone would (median of 3 runs).
const base = process.env.BASE_PATH ?? "/";
const origin = "http://127.0.0.1:4173";
const pages = ["", "learn/", "learn/printing/first-program/", "playground/", "deathmatch/", "bench/", "projects/", "record/", "topics/", "pro/"];
const thresholds = {
  "categories:performance": ["error", { minScore: 0.8, aggregationMethod: "median-run" }],
  "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median-run" }],
  "categories:best-practices": ["error", { minScore: 0.95, aggregationMethod: "median-run" }],
  "categories:seo": ["error", { minScore: 0.95, aggregationMethod: "median-run" }],
  "resource-summary:script:size": ["error", { maxNumericValue: 921600, aggregationMethod: "median" }],
};
// The record page is personal (made from this browser's progress), so it asks search engines not to
// index it (noindex, like /transfer/), which Lighthouse's SEO score counts against it (is-crawlable).
// There every other SEO check must pass instead of the category score.
const seoButCrawlable = ["document-title", "meta-description", "http-status-code", "link-text", "crawlable-anchors", "hreflang", "canonical"];
const recordAssertions = { ...thresholds, "categories:seo": "off" };
for (const id of seoButCrawlable) recordAssertions[id] = ["error", { minScore: 1, aggregationMethod: "median-run" }];
module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/serve.mjs",
      startServerReadyPattern: "Serving dist",
      url: pages.map((p) => `${origin}${base}${p}`),
      numberOfRuns: 3,
      settings: { chromeFlags: "--no-sandbox --headless=new" },
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: "^(?!.*/record/$).*$", assertions: thresholds },
        { matchingUrlPattern: "/record/$", assertions: recordAssertions },
      ],
    },
    upload: { target: "filesystem", outputDir: "./lhci" },
  },
};
