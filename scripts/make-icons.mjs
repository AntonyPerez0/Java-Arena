// Draws the app icons (public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png)
// from public/favicon.svg with headless Chromium. Run by hand when the logo changes; the PNGs are committed.
import { readFileSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
// The mark full-bleed, for icons the phone crops to its own shape: the tile's red and blue halves
// fill the whole square (the same diagonal, x + y = 32), and only the white J is scaled about the
// center. Android's maskable icon keeps the J inside the central safe zone (a circle 80% wide);
// iOS rounds the corners of the apple-touch icon itself, so that one keeps the J at full size.
const colors = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]);
const j = svg.match(/<path d="M11[^>]*\/>/)?.[0];
if (colors.length < 2 || !j) throw new Error("make-icons: favicon.svg no longer has the tile's two colors and the J path");
const [blue, red] = colors;
const fullBleed = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${blue}"/><path d="M0 32V0H32Z" fill="${red}"/><g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${j}</g></svg>`;

const browser = await launchChromium();
const page = await browser.newPage();
const shots = [
  { file: "icon-192.png", size: 192, svg },
  { file: "icon-512.png", size: 512, svg },
  { file: "icon-maskable-512.png", size: 512, svg: fullBleed(0.8) },
  { file: "apple-touch-icon.png", size: 180, svg: fullBleed(1) },
];
for (const s of shots) {
  await page.setViewportSize({ width: s.size, height: s.size });
  await page.setContent(`<html><body style="margin:0;background:transparent;width:${s.size}px;height:${s.size}px">${s.svg.replace("<svg ", `<svg width="${s.size}" height="${s.size}" style="display:block" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../public/${s.file}`, import.meta.url).pathname, omitBackground: true });
  console.log(`public/${s.file}`);
}
await browser.close();
