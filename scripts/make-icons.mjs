// Draws the app icons (public/icon-192.png, icon-512.png, icon-maskable-512.png) from
// public/favicon.svg with headless Chromium. Run by hand when the logo changes; the PNGs are committed.
import { readFileSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
const browser = await launchChromium();
const page = await browser.newPage();
// The maskable icon keeps the mark inside the central safe zone, on a full-bleed background: the
// site's dark page color (the manifest's theme and background color), which keeps both halves of the
// tile clear under a circle or squircle mask.
const shots = [
  { file: "icon-192.png", size: 192, pad: 0, bg: "transparent" },
  { file: "icon-512.png", size: 512, pad: 0, bg: "transparent" },
  { file: "icon-maskable-512.png", size: 512, pad: 0.2, bg: "#09090b" },
];
for (const s of shots) {
  await page.setViewportSize({ width: s.size, height: s.size });
  const inner = Math.round(s.size * (1 - 2 * s.pad));
  await page.setContent(`<html><body style="margin:0;background:${s.bg};display:grid;place-items:center;width:${s.size}px;height:${s.size}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../public/${s.file}`, import.meta.url).pathname, omitBackground: s.bg === "transparent" });
  console.log(`public/${s.file}`);
}
await browser.close();
