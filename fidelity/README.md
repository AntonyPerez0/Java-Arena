# Fidelity suite

Java Arena computes every expected output with a real JDK 21 at build time, and grades learners' code with the in-browser engine. They must agree. This suite checks that they do.

- `programs/NN-name/`: 30 small programs in the style of the course. Each has `Main.java`, and optionally `stdin.txt`, `files/` (put in the program's working folder) and `meta.json` (`args`, `nondeterministic`, `note`). Together they cover Scanner input, `HashMap` and `HashSet` order, double and float printing, `printf` rounding, seeded `Random`, `Math`, integer overflow, strings, streams, records and enums, comparators, interfaces, caught and uncaught exceptions (with causes and exit codes), files through `java.io` and `java.nio.file`, `java.time`, stack overflow, `System.exit`, and a CPU-heavy program.
- `errors/NN-name/`: 18 programs that must not compile, the mistakes beginners make most.

Run it:

```bash
npm run fidelity:jdk        # the reference: javac and java from JAVA_HOME or the path
npm run build && npm run fidelity:browser   # the same suite through the built site in headless Chromium
```

`fidelity:browser` compares each program's stdout (byte for byte), exit code, the first line of stderr and the learner's own stack frames, and the files the program wrote. It also runs two cross-checks that separate the halves of the engine: classes compiled by the browser's javac run on HotSpot, and classes compiled by the command-line javac run on the browser's JVM. For the error programs, every line javac prints must be identical. The report is written to `fidelity/out/report.md`, and CI fails on any difference.

The reference JVM runs with `-Duser.language=en -Duser.country=US -Duser.timezone=UTC`, UTF-8 encodings and `-XX:+UnlockDiagnosticVMOptions -XX:-UseLibmIntrinsic` (so `Math.sin` and friends match what an interpreter computes). Program 29 prints an identity hash code (`Main$Book@...`), which differs between any two runs; only that part is ignored.
