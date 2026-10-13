// The Pro Track in the site build: two modules the app imports, made from the source files
// (scripts/pro-track/site.mjs), and each project's zip in the built site.
//   virtual:pro-track        what the main bundle needs: each project's id, title, summary, hours and checklist
//   virtual:pro-track-pages  the project pages' text (README sections as HTML) and links, for the
//                            Pro Track pages' own chunk
//   dist/pro/<id>.zip        pro-track/<id>/ as a zip, the same bytes for the same files (makeZip)
// A problem in content/pro-track.yaml or a project folder's README stops the build. The dev server
// serves the zips too, made when asked for.
import fs from "node:fs";
import path from "node:path";
import { folderProblems, layoutProblems, zipProject } from "./project.mjs";
import { indexOf, readProTrack } from "./site.mjs";

const INDEX = "virtual:pro-track";
const PAGES = "virtual:pro-track-pages";

export default function proTrack(root) {
  let data = null;
  const read = () => {
    const r = readProTrack(root, { zips: true });
    const problems = [...r.problems, ...layoutProblems(root), ...r.projects.flatMap((p) => folderProblems(root, p.id))];
    if (problems.length) throw new Error(`The Pro Track has ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n  ${problems.join("\n  ")}`);
    return r;
  };
  const watch = (ctx) => {
    ctx.addWatchFile(path.join(root, "content", "pro-track.yaml"));
    for (const p of data.projects) ctx.addWatchFile(path.join(root, "pro-track", p.id, "README.md"));
  };
  return {
    name: "pro-track",
    buildStart() {
      data = read();
    },
    resolveId(id) {
      return id === INDEX || id === PAGES ? "\0" + id : null;
    },
    load(id) {
      if (id !== "\0" + INDEX && id !== "\0" + PAGES) return null;
      data ??= read();
      watch(this);
      if (id === "\0" + INDEX) return `export default ${JSON.stringify(indexOf(data.projects))};`;
      const pages = Object.fromEntries(data.projects.map((p) => [p.id, { summaryHtml: p.summaryHtml, practices: p.practices, checklist: p.checklist, sections: p.sections, zip: p.zip, folder: p.folder }]));
      return `export default ${JSON.stringify(pages)};`;
    },
    generateBundle() {
      // Only in the app's build (the workers' builds have no pages).
      if (!data) return;
      for (const p of data.projects) this.emitFile({ type: "asset", fileName: p.zip.file, source: zipProject(root, p.id) });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /\/pro\/([a-z0-9-]+)\.zip$/.exec((req.url ?? "").split("?")[0]);
        if (!m || !fs.existsSync(path.join(root, "pro-track", m[1], "pom.xml"))) return next();
        const zip = zipProject(root, m[1]);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Length", String(zip.length));
        res.end(Buffer.from(zip));
      });
    },
  };
}
