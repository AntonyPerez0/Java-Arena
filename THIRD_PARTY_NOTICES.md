# Third-party notices

Java Arena's own code is MIT licensed (see [LICENSE](LICENSE) for its scope). The site also serves the following third-party components, which keep their own licenses. The full license texts ship next to the files in `engine/dist/compiler/licenses/` and `engine/dist/runner/licenses/`, and are published with the site.

## The Java engine (downloaded by the browser from this site)

| Component | Where it is | License |
|---|---|---|
| OpenJDK javac, from [openjdk/jdk21u](https://github.com/openjdk/jdk21u) tag `jdk-21.0.10+7`, with Java Arena's patches | `javac.wasm` | GPL-2.0 with the Classpath Exception |
| Code copied from OpenJDK 21's `java.base` (number parsing and printing, string helpers) | `javac.wasm` | GPL-2.0 with the Classpath Exception |
| OpenJDK 21 `java.base` class library (Eclipse Temurin 21.0.10+7 build) | `java-base-sdk.bin` (class files without method bodies), `jdk.zip` (the runtime image) | GPL-2.0 with the Classpath Exception |
| [TeaVM](https://github.com/konsoletyper/teavm) 0.13.1 runtime and class library | `javac.wasm`, `javac.wasm-runtime.js` | Apache-2.0 (with its NOTICE: Alexey Andreev, the Apache Software Foundation, Joda.org) |
| [teavm-javac](https://github.com/konsoletyper/teavm-javac) | `javac.wasm` | Apache-2.0 |
| [jzlib](https://github.com/ymnk/jzlib) 1.1.3 (inside TeaVM's `java.util.zip`) | `javac.wasm` | BSD-style |
| [Ristretto](https://github.com/theseus-rs/ristretto), with Java Arena's patches | `runner.core*.wasm`, `runner.js` | MIT or Apache-2.0 |
| The Rust crates compiled into Ristretto | `runner.core.wasm` | Mostly MIT and/or Apache-2.0; every crate's license text is in `engine/dist/runner/licenses/THIRD_PARTY_LICENSES.txt` |
| [jco](https://github.com/bytecodealliance/jco) runtime helpers generated into `runner.js` | `runner.js` | Apache-2.0 WITH LLVM-exception |

The source code of the GPL-licensed parts, and how to rebuild everything, is described in [engine/SOURCES.md](engine/SOURCES.md).

## Build and test tools

Vite (MIT) bundles the site and may add small runtime helpers to the published scripts, such as its module preload helper. TypeScript, Playwright and axe-core are used to build and test the site and are not part of the published pages.
