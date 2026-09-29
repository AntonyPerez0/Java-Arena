// Writes dist/licenses/npm-packages.txt: the name, version, license and license text of every npm
// package the published site is built from (the production dependencies, including the two
// fonts), as their licenses ask copies to carry. Called by scripts/finish-build.mjs.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function writeNpmLicenses(root, outFile) {
  const tree = JSON.parse(execFileSync("npm", ["ls", "--omit=dev", "--all", "--json", "--long"], { cwd: root, encoding: "utf8", maxBuffer: 32 << 20 }));
  const seen = new Map();
  const walk = (deps) => {
    for (const d of Object.values(deps ?? {})) {
      if (d.path && !seen.has(d.path)) seen.set(d.path, d);
      walk(d.dependencies);
    }
  };
  walk(tree.dependencies);
  const packages = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  const missing = [];
  const parts = packages.map((p) => {
    const pkg = JSON.parse(readFileSync(join(p.path, "package.json"), "utf8"));
    const file = readdirSync(p.path).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
    if (!file) missing.push(pkg.name);
    const author = typeof pkg.author === "string" ? pkg.author : pkg.author?.name;
    const text = file ? readFileSync(join(p.path, file), "utf8").trim() : `License: ${pkg.license}${author ? `, by ${author}` : ""} (the package has no separate license file; see ${pkg.homepage ?? pkg.repository?.url ?? "its repository"}).`;
    return `${"=".repeat(78)}\n${pkg.name} ${pkg.version} (${typeof pkg.license === "string" ? pkg.license : JSON.stringify(pkg.license)})\n${pkg.homepage ?? ""}\n${"=".repeat(78)}\n\n${text}\n`;
  });
  mkdirSync(join(outFile, ".."), { recursive: true });
  writeFileSync(outFile, `Third-party npm packages in Java Arena's published pages (including the Inter and JetBrains Mono fonts).\nThe Java engine's own components are listed in engine/licenses/.\n\n${parts.join("\n")}`);
  return { count: packages.length, missing };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = new URL("..", import.meta.url).pathname;
  const r = writeNpmLicenses(root, join(root, "dist", "licenses", "npm-packages.txt"));
  console.log(`${r.count} packages; without a license file: ${r.missing.join(", ") || "none"}`);
  if (!existsSync(join(root, "dist"))) process.exit(1);
}
