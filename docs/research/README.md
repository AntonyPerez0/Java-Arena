# Research notes (September 2026)

Working notes from the research that planned Java Arena. They were written by research agents and checked by separate fact-checking agents. Paths such as `/home/user/ref/...` point to scratch folders in the container where the research ran; they are not part of this repository.

## Decisions taken from this research

- **Curriculum:** follow all 14 parts of the University of Helsinki Java Programming MOOC. 54 modules and 333 steps cover all 68 section pages and all 262 visible exercises (a script checked that every exercise is mapped exactly once). Five optional extra modules that are not in the MOOC (recursion, records, switch/var/text blocks, pattern matching and sealed types, linked structures) come at the end. Every lesson and exercise is written fresh for this site.
- **Engine:** real javac 21 compiled to WebAssembly (teavm-javac) plus the Ristretto JVM compiled to WebAssembly, running the real JDK 21 class library. Everything is self-hosted. CheerpJ is the fallback only if the prototype fails its gates.
- **Java version:** Java 21 everywhere (build-time reference, browser compiler, browser runtime).
- **Licenses:** site code under MIT; lesson content under CC BY-NC-SA 4.0 with attribution to the MOOC on every lesson page and in the footer. No MOOC exercise templates, tests or media are copied.
- **Name:** Java Arena, with the notice "Java is a registered trademark of Oracle and/or its affiliates."

## Files

| File | What it is |
|---|---|
| `curriculum-map.md` / `.json` | The full module and step map, with the MOOC section and exercises each step covers, and how to handle what cannot run in a browser |
| `mooc-outline.txt` | Machine-made outline of every MOOC section and exercise, used to check coverage |
| `mooc-parts-*.md` | Section-by-section reading of the MOOC, with every exercise classified |
| `runtime-judgment.md` | Comparison of ways to run Java in the browser, and the recommendation |
| `runtime-factcheck.md` | Adversarial check of the runtime claims (with corrections) |
| `rt-cheerpj.md`, `rt-teavm.md`, `rt-others.md` | Per-option runtime research |
| `license.md`, `license-factcheck.md` | License findings for the MOOC material, exercise templates and tests, media and runtimes |
| `ref-core.md`, `ref-ui.md` | How the reference site C/C++ Arena is built (build side and user-facing side) |

## Attribution

Several files in this folder (`mooc-outline.txt`, the `mooc-parts-*.md` notes, `curriculum-map.md` and `curriculum-map.json`, and some of the other reports) quote short excerpts of section titles and exercise descriptions from *Java Programming* (https://java-programming.mooc.fi) by Arto Hellas, Matti Luukkainen and contributors, Agile Education Research group, University of Helsinki, licensed under CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/). These notes are shared under the same license. Java Arena is not affiliated with or endorsed by the University of Helsinki or MOOC.fi.
