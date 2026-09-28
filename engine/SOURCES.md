# Source code of the Java engine

The Java engine that Java Arena serves contains software licensed under the GNU General Public License version 2 with the Classpath Exception (OpenJDK). This page lists exactly which source it was built from, so anyone can get, inspect, change and rebuild it.

## What was built from what

| Engine file | Built from | Exact version |
|---|---|---|
| `javac.wasm` | OpenJDK javac: https://github.com/openjdk/jdk21u | tag `jdk-21.0.10+7`, commit `97a3d2372d457c5a72413df14bf08cf99545c695` |
| | teavm-javac: https://github.com/konsoletyper/teavm-javac | commit `2ddcf02e4983e5c74d45b945c2fd41a829358828` |
| | TeaVM: https://github.com/konsoletyper/teavm | tag `0.13.1`, commit `b3a245b7d9034ff35cdfab2def057a3d4f256efb` (Maven Central artifacts `org.teavm:*:0.13.1`) |
| | Java Arena's changes | [`engine/compiler/`](compiler/): `patches/`, `java/`, `javac-src/`, `tools/` and `build.sh` in this repository |
| `java-base-sdk.bin` | the `java.base` module of Eclipse Temurin 21.0.10+7 (https://github.com/adoptium/temurin21-binaries, release `jdk-21.0.10+7`, fetched and SHA-256 checked by `scripts/get-jdk.sh`) | source: https://github.com/adoptium/jdk21u tag `jdk-21.0.10+7` (the same code as openjdk/jdk21u tag `jdk-21.0.10+7`) |
| | Java Arena's tool that removes method bodies | [`engine/compiler/sdk-tool/`](compiler/sdk-tool/) |
| `jdk.zip` | the same Temurin 21.0.10+7 `java.base`, linked with `jlink --add-modules java.base --no-header-files --no-man-pages` | as above |
| `runner.core*.wasm`, `runner.js` | Ristretto: https://github.com/theseus-rs/ristretto | commit `8448588ecfcedf79a59d697939493f289c1c6ad7` |
| | Java Arena's changes | [`engine/runner/patches/ristretto.patch`](runner/patches/ristretto.patch), [`engine/runner/`](runner/) `build.sh` and `scripts/` |

`engine/dist/compiler/manifest.json` and `engine/dist/runner/manifest.json` record the size and SHA-256 of every served file.

## Rebuilding

- `engine/compiler/build.sh` rebuilds the compiler files from the sources above.
- `engine/runner/build.sh` rebuilds the runner files and the JDK image.

Their READMEs list the requirements and the network hosts they use.

## Written offer

For at least three years after the last time any version of the engine is served from this site, the maintainer of Java Arena will provide a complete copy of the corresponding source code of the GPL-licensed parts of that version to anyone who asks, at no charge beyond the cost of physically sending it. To ask, open an issue at https://github.com/AntonyPerez0/Java-Arena/issues.
