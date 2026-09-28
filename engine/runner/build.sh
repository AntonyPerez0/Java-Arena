#!/usr/bin/env bash
# Builds the Java Arena runner into engine/dist/runner/:
#   - Ristretto (a JVM in Rust) at a pinned commit, with patches/ristretto.patch, compiled to a
#     wasm32-wasip2 component and turned into core modules plus runner.js by jco;
#   - jdk.zip, a java.base-only JDK 21 image made with jlink from the reference JDK;
#   - manifest.json (sizes, gzip sizes, SHA-256, pinned sources) and licenses/.
# Usage: engine/runner/build.sh [--clean] [--test]
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
WORK=${ARENA_RUNNER_WORK:-/home/user/build/runner}
JDK=${ARENA_JDK:-/usr/lib/jvm/java-21-openjdk-amd64}
JOBS=${ARENA_JOBS:-2}
DIST="$REPO/engine/dist/runner"
RISTRETTO_REPO=https://github.com/theseus-rs/ristretto
RISTRETTO_COMMIT=8448588ecfcedf79a59d697939493f289c1c6ad7
JCO_TRANSPILE=0.12.1
FFLATE=0.8.3

CLEAN=0
TEST=0
for arg in "$@"; do
  case "$arg" in
    --clean) CLEAN=1 ;;
    --test) TEST=1 ;;
    *) echo "unknown option $arg" >&2; exit 2 ;;
  esac
done
[ "$CLEAN" = 1 ] && rm -rf "$WORK/src" "$WORK/target" "$WORK/node" "$WORK/gen" "$WORK/jdk-image"
mkdir -p "$WORK"
unset JAVA_TOOL_OPTIONS _JAVA_OPTIONS JDK_JAVA_OPTIONS

echo "== Ristretto sources at $RISTRETTO_COMMIT"
if [ ! -d "$WORK/src/.git" ]; then
  git init -q "$WORK/src"
  git -C "$WORK/src" remote add origin "$RISTRETTO_REPO"
fi
git -C "$WORK/src" fetch -q --depth 1 origin "$RISTRETTO_COMMIT"
git -C "$WORK/src" checkout -q --force FETCH_HEAD
git -C "$WORK/src" clean -qfdx
git -C "$WORK/src" apply --whitespace=nowarn "$HERE/patches/ristretto.patch"

echo "== Rust build (wasm32-wasip2 component)"
rustup target add wasm32-wasip2 >/dev/null
# The same settings as Ristretto's web/scripts/build-runtime.mjs.
(
  cd "$WORK/src"
  RUSTC_BOOTSTRAP=1 \
  CARGO_TARGET_DIR="$WORK/target" \
  CARGO_TARGET_WASM32_WASIP2_RUSTFLAGS='-C link-arg=-zstack-size=8388608' \
  cargo build -j "$JOBS" --locked -p ristretto_playground --target wasm32-wasip2 --release
)

echo "== jco transpile"
mkdir -p "$WORK/node"
cp "$HERE/scripts/transpile.mjs" "$HERE/scripts/pack-jdk.mjs" "$HERE/scripts/licenses.mjs" "$WORK/node/"
if [ ! -d "$WORK/node/node_modules/@bytecodealliance/jco-transpile" ] || [ ! -d "$WORK/node/node_modules/fflate" ]; then
  (cd "$WORK/node" && printf '{ "name": "arena-runner-build", "private": true, "type": "module" }\n' > package.json &&
    npm install --no-audit --no-fund --save-exact "@bytecodealliance/jco-transpile@$JCO_TRANSPILE" "fflate@$FFLATE" >/dev/null)
fi
rm -rf "$WORK/gen"
node "$WORK/node/transpile.mjs" "$WORK/target/wasm32-wasip2/release/ristretto_playground_engine.wasm" "$WORK/gen"

echo "== JDK image (java.base) from $JDK"
rm -rf "$WORK/jdk-image"
"$JDK/bin/jlink" --add-modules java.base --no-header-files --no-man-pages --output "$WORK/jdk-image"
node "$WORK/node/pack-jdk.mjs" "$WORK/jdk-image" "$WORK/gen/jdk.zip"

echo "== dist"
rm -rf "$DIST"
mkdir -p "$DIST/licenses"
cp "$WORK/gen/runner.core.wasm" "$WORK/gen/runner.core2.wasm" "$WORK/gen/runner.core3.wasm" "$WORK/gen/runner.js" "$WORK/gen/jdk.zip" "$DIST/"
cp "$HERE/runner-host.mjs" "$HERE/wasi-host.mjs" "$DIST/"
cp "$WORK/src/LICENSE-MIT" "$DIST/licenses/Ristretto-LICENSE-MIT.txt"
cp "$WORK/src/LICENSE-APACHE" "$DIST/licenses/Ristretto-LICENSE-APACHE.txt"
cp -rL "$WORK/jdk-image/legal/java.base" "$DIST/licenses/OpenJDK-java.base"
(cd "$WORK/node" && node licenses.mjs "$WORK/src" "$DIST/licenses/THIRD_PARTY_LICENSES.txt")

JDK_RELEASE=$(grep '^JAVA_VERSION=' "$WORK/jdk-image/release" | cut -d'"' -f2)
UBUNTU_PACKAGE=$(dpkg-query -W -f='${Package} ${Version}' openjdk-21-jdk-headless 2>/dev/null || echo unknown)
node - "$DIST" "$RISTRETTO_COMMIT" "$JDK_RELEASE" "$UBUNTU_PACKAGE" <<'NODE'
const { readFileSync, writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { gzipSync } = require('node:zlib');
const [dist, commit, jdk, ubuntu] = process.argv.slice(2);
const names = ['runner.core.wasm', 'runner.core2.wasm', 'runner.core3.wasm', 'jdk.zip', 'runner.js', 'runner-host.mjs', 'wasi-host.mjs'];
const files = names.map((name) => {
  const data = readFileSync(`${dist}/${name}`);
  return { name, bytes: data.length, gzip9Bytes: gzipSync(data, { level: 9 }).length, sha256: createHash('sha256').update(data).digest('hex') };
});
const manifest = {
  description: 'Java Arena runner: Ristretto (a JVM in Rust) as WebAssembly, with a java.base-only JDK 21 image',
  files,
  sources: {
    ristretto: { repo: 'https://github.com/theseus-rs/ristretto', commit, license: 'Apache-2.0 OR MIT', patches: 'engine/runner/patches/ristretto.patch in the Java Arena repository' },
    'jdk image': { from: 'jlink --add-modules java.base of the reference JDK', jdkVersion: jdk, ubuntuPackage: ubuntu, license: 'GPL-2.0-only WITH Classpath-exception-2.0' },
    'rust crates': 'licenses/THIRD_PARTY_LICENSES.txt',
  },
};
writeFileSync(`${dist}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
for (const f of files) console.log(`${f.name}: ${f.bytes} bytes, gzip ${f.gzip9Bytes}`);
NODE

if [ "$TEST" = 1 ]; then
  echo "== tests"
  node "$HERE/test/run-tests.mjs"
fi
echo "done: $DIST"
