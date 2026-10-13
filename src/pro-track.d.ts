// The Pro Track's data, made by the site build from content/pro-track.yaml and pro-track/<id>/README.md
// (scripts/pro-track/vite-plugin.mjs).
declare module "virtual:pro-track" {
  const projects: import("./lib/pro").ProProject[];
  export default projects;
}
declare module "virtual:pro-track-pages" {
  const pages: Record<string, import("./lib/pro").ProPageData>;
  export default pages;
}
