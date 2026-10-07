// Running a program that uses Java Arena's JavaFX on the reference JDK, as the browser engine runs it.
//
// The JDK's launcher refuses a main class that extends javafx.application.Application when no
// javafx.graphics module is in the boot layer ("Error: JavaFX runtime components are missing"),
// and Java Arena's JavaFX is a library on the class path. So such a program runs through
// arena.reference.JavaFxLauncher (scripts/javafx/JavaFxLauncher.java): it calls the program's main
// with its own frames hidden, so the output, stack traces and exit code are those of `java Main`
// in every other respect. See that file.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JAVAFX_LIBRARY } from "../../src/grader/javafx.js";

export const LAUNCHER_CLASS = "arena.reference.JavaFxLauncher";
const SOURCE = new URL("./JavaFxLauncher.java", import.meta.url).pathname;

/**
 * Identifies how the reference JDK runs a JavaFX program: the launcher's source and this file's
 * (which says how java starts it). The content build's run cache keys JavaFX runs with it, so a
 * change to either runs them again. Paths (the launcher's temporary folder) are left out of it.
 */
export const LAUNCHER_KEY = createHash("sha256").update(readFileSync(SOURCE)).update(readFileSync(new URL(import.meta.url).pathname)).digest("hex").slice(0, 16);

const compiled = new Map();
/** The folder of the compiled launcher, compiled once per process with this JDK (removed at exit). */
function launcherDir(javaHome) {
  if (!compiled.has(javaHome)) {
    const dir = mkdtempSync(join(tmpdir(), "java-arena-fx-launcher-"));
    process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
    const env = { ...process.env };
    delete env.JAVA_TOOL_OPTIONS;
    // @Hidden is the JDK's own annotation, so its package must be exported to compile against it.
    const r = spawnSync(join(javaHome, "bin", "javac"), ["--add-exports", "java.base/jdk.internal.vm.annotation=ALL-UNNAMED", "-d", dir, SOURCE], { env, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`couldn't compile ${SOURCE}:\n${r.stdout}${r.stderr}`);
    compiled.set(javaHome, dir);
  }
  return compiled.get(javaHome);
}

/**
 * The arguments of `java` that run `mainClass` with `args`: the class path, then the main class,
 * through the launcher when the program uses Java Arena's JavaFX (`libraries` includes "javafx").
 * Put the JVM's own options (such as REFERENCE_JVM_FLAGS) before these.
 */
export function javaRunArgs({ javaHome, libraries = [], classPath, mainClass, args = [] }) {
  if (!libraries.includes(JAVAFX_LIBRARY)) return ["-cp", classPath, mainClass, ...args];
  return ["--add-exports=java.base/sun.launcher=ALL-UNNAMED", `-Xbootclasspath/a:${launcherDir(javaHome)}`, "-cp", classPath, LAUNCHER_CLASS, mainClass, ...args];
}
