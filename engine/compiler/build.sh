#!/usr/bin/env bash
# Builds the Java Arena compiler from pinned sources:
#   OpenJDK javac 21 (openjdk/jdk21u) -> javac.wasm (Wasm GC) with TeaVM via teavm-javac,
#   java.base platform classes (from the reference JDK's java.base.jmod) -> java-base-sdk.bin,
# and writes them with the host module and a manifest to engine/dist/compiler/.
#
# Usage: engine/compiler/build.sh [--clean] [--test]
#   --clean  delete the work directory first (clones, Gradle home, build outputs)
#   --test   run engine/compiler/test/run-tests.mjs afterwards
# Environment:
#   ARENA_COMPILER_WORK  work directory (default /home/user/build/compiler)
#   ARENA_JDK            reference JDK 21 home with jmods/ (default: Temurin 21.0.10+7 from scripts/get-jdk.sh)
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
DIST=$(cd "$HERE/.." && pwd)/dist/compiler
WORK=${ARENA_COMPILER_WORK:-/home/user/build/compiler}
JDK=${ARENA_JDK:-$(bash "$(dirname "$0")/../../scripts/get-jdk.sh")}

# Pinned sources. The site's source offer must list these.
JDK21U_URL=https://github.com/openjdk/jdk21u
JDK21U_TAG=jdk-21.0.10+7
JDK21U_COMMIT=97a3d2372d457c5a72413df14bf08cf99545c695
TEAVM_JAVAC_URL=https://github.com/konsoletyper/teavm-javac
TEAVM_JAVAC_COMMIT=2ddcf02e4983e5c74d45b945c2fd41a829358828
TEAVM_URL=https://github.com/konsoletyper/teavm
TEAVM_TAG=0.13.1
TEAVM_COMMIT=b3a245b7d9034ff35cdfab2def057a3d4f256efb
JZLIB_URL=https://github.com/ymnk/jzlib
JZLIB_TAG=1.1.3
ASM_URL=https://repo1.maven.org/maven2/org/ow2/asm/asm/9.8/asm-9.8.jar
ASM_SHA256=876eab6a83daecad5ca67eb9fcabb063c97b5aeb8cf1fca7a989ecde17522051
EXPECTED_JDK_VERSION=21.0.10

CLEAN=0
TEST=0
for arg in "$@"; do
    case "$arg" in
        --clean) CLEAN=1 ;;
        --test) TEST=1 ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

log() { printf '\n== %s\n' "$*"; }
now() { date +%s; }
T_START=$(now)

export JAVA_HOME="$JDK"
export PATH="$JDK/bin:$PATH"
# Keep Gradle's caches and distribution inside the work directory.
export GRADLE_USER_HOME="$WORK/gradle-home"

log "Checking tools"
JAVA_VERSION=$(sed -n 's/^JAVA_VERSION="\(.*\)"/\1/p' "$JDK/release")
release_field() { sed -n "s/^$1=\"\(.*\)\"/\1/p" "$JDK/release"; }
JDK_BUILD="$(release_field IMPLEMENTOR) $(release_field IMPLEMENTOR_VERSION) (java.runtime.version $(release_field JAVA_RUNTIME_VERSION))"
JDK_SOURCE_REPO=$(release_field SOURCE_REPO | sed 's/\.git$//')
JDK_SOURCE="${JDK_SOURCE_REPO:-https://github.com/openjdk/jdk21u} tag jdk-$(release_field SEMANTIC_VERSION)"
echo "reference JDK: $JDK ($JAVA_VERSION)"
if [ "$JAVA_VERSION" != "$EXPECTED_JDK_VERSION" ]; then
    echo "warning: expected JDK $EXPECTED_JDK_VERSION; the SDK archive and javac sources are pinned to it" >&2
fi
[ -f "$JDK/jmods/java.base.jmod" ] || { echo "missing $JDK/jmods/java.base.jmod" >&2; exit 1; }
for tool in git node gzip sha256sum curl; do
    command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }
done

if [ "$CLEAN" = 1 ]; then
    log "Removing $WORK"
    rm -rf "$WORK"
fi
mkdir -p "$WORK/src" "$WORK/deps" "$WORK/out"

# --- 1. Sources -------------------------------------------------------------
JDK21U="$WORK/src/jdk21u"
TJ="$WORK/src/teavm-javac"

log "Fetching openjdk/jdk21u $JDK21U_TAG (sparse)"
if [ ! -d "$JDK21U/.git" ]; then
    git clone -q --filter=blob:none --no-checkout --depth 1 --branch "$JDK21U_TAG" "$JDK21U_URL" "$JDK21U"
    git -C "$JDK21U" sparse-checkout init --no-cone
    printf '%s\n' \
        /make/langtools/tools/ \
        /src/jdk.compiler/ \
        /src/java.compiler/ \
        /src/jdk.internal.opt/ \
        /src/java.base/share/classes/jdk/internal/jmod/ \
        /src/java.base/share/classes/jdk/internal/math/ \
        /LICENSE /ASSEMBLY_EXCEPTION > "$JDK21U/.git/info/sparse-checkout"
fi
git -C "$JDK21U" checkout -q -f "$JDK21U_COMMIT"
git -C "$JDK21U" clean -q -fd
[ "$(git -C "$JDK21U" rev-parse HEAD)" = "$JDK21U_COMMIT" ] || { echo "jdk21u is not at $JDK21U_COMMIT" >&2; exit 1; }

log "Fetching konsoletyper/teavm-javac $TEAVM_JAVAC_COMMIT"
if [ ! -d "$TJ/.git" ]; then
    git init -q "$TJ"
    git -C "$TJ" remote add origin "$TEAVM_JAVAC_URL"
fi
if ! git -C "$TJ" cat-file -e "$TEAVM_JAVAC_COMMIT^{commit}" 2>/dev/null; then
    git -C "$TJ" fetch -q --depth 1 origin "$TEAVM_JAVAC_COMMIT"
fi
git -C "$TJ" checkout -q -f "$TEAVM_JAVAC_COMMIT"
git -C "$TJ" clean -q -fd -e build -e .gradle

# --- 2. Patches and added sources ------------------------------------------
log "Applying patches"
git -C "$JDK21U" apply --whitespace=nowarn "$HERE/patches/jdk21u-javac.patch"
git -C "$TJ" apply --whitespace=nowarn "$HERE/patches/teavm-javac.patch"
cp -r "$HERE/java/javaarena" "$TJ/compiler/src/main/java/"

# JDK 21's own number parsing/printing (jdk.internal.math), copied into javac's
# build under the package javaarena.jdk. Edits: package name; drop the CDS
# archive hook; Math.multiplyHigh and the String(byte[],int,int,int) constructor,
# which TeaVM 0.13.1 lacks, are replaced by equivalents.
log "Generating javaarena.jdk (JDK 21 number and character code for javac)"
GEN="$WORK/gen-src"
rm -rf "$GEN"
mkdir -p "$GEN/javaarena/jdk"
MATH_SRC="$JDK21U/src/java.base/share/classes/jdk/internal/math"
for f in FloatingDecimal FDBigInteger DoubleConsts FloatConsts DoubleToDecimal FloatToDecimal FormattedFPDecimal MathUtils; do
    sed -e 's/^package jdk\.internal\.math;/package javaarena.jdk;\n\n\/\/ Java Arena: copied from openjdk\/jdk21u '"$JDK21U_TAG"' (jdk.internal.math) and modified by engine\/compiler\/build.sh./' \
        -e 's/jdk\.internal\.math\./javaarena.jdk./g' \
        -e '/^import jdk\.internal\.misc\.CDS;/d' \
        -e '/CDS\.initializeFromArchive(FDBigInteger\.class);/d' \
        -e 's/^import static java\.lang\.Math\.multiplyHigh;/import static javaarena.jdk.MultiplyHigh.multiplyHigh;/' \
        -e 's/return new String(bytes, 0, 0, index + 1);/return new String(bytes, 0, index + 1, java.nio.charset.StandardCharsets.ISO_8859_1);/' \
        "$MATH_SRC/$f.java" > "$GEN/javaarena/jdk/$f.java"
done
cp "$HERE"/javac-src/javaarena/jdk/*.java "$GEN/javaarena/jdk/"
# Character tables for javac's scanner, computed by the reference JDK itself.
java "$HERE/tools/GenJdkChars.java" "$GEN" 2>&1 | grep -v '^Picked up JAVA_TOOL_OPTIONS' || true
[ -f "$GEN/javaarena/jdk/JdkChars.java" ] || { echo "GenJdkChars failed" >&2; exit 1; }
if grep -rq '^import .*jdk\.internal\|CDS\.\|java\.lang\.Math\.multiplyHigh\|bytes, 0, 0,' "$GEN"; then
    echo "vendored math still references JDK internals:" >&2
    grep -rn '^import .*jdk\.internal\|CDS\.\|java\.lang\.Math\.multiplyHigh\|bytes, 0, 0,' "$GEN" >&2
    exit 1
fi

# --- 3. javac -> Wasm with TeaVM --------------------------------------------
log "Building javac.wasm with Gradle (TeaVM 0.13.1)"
T0=$(now)
GRADLE_LOG="$WORK/gradle.log"
if ! (cd "$TJ" && ./gradlew --no-daemon --max-workers=2 --console=plain \
        -Pjdk.sourceDir="$JDK21U" -Parena.extraSourceDir="$GEN" \
        :compiler:buildWasmGC) > "$GRADLE_LOG" 2>&1; then
    grep -v '^Picked up JAVA_TOOL_OPTIONS' "$GRADLE_LOG" | tail -60 >&2
    echo "Gradle build failed; full log: $GRADLE_LOG" >&2
    exit 1
fi
WASM_DIR="$TJ/compiler/build/generated/teavm/wasm-gc"
echo "Gradle + TeaVM: $(( $(now) - T0 )) s"

# --- 4. Platform classes archive --------------------------------------------
log "Building java-base-sdk.bin from $JDK/jmods/java.base.jmod"
ASM_JAR="$WORK/deps/asm-9.8.jar"
if [ ! -f "$ASM_JAR" ] || ! echo "$ASM_SHA256  $ASM_JAR" | sha256sum -c --quiet 2>/dev/null; then
    for attempt in 1 2 3; do
        curl -sSfL -o "$ASM_JAR" "$ASM_URL" && break
        sleep $((attempt * 5))
    done
    echo "$ASM_SHA256  $ASM_JAR" | sha256sum -c --quiet
fi
rm -rf "$WORK/sdk-tool-classes"
javac -d "$WORK/sdk-tool-classes" -cp "$ASM_JAR" "$HERE/sdk-tool/SdkTool.java" 2>&1 | grep -v '^Picked up JAVA_TOOL_OPTIONS' || true
java -cp "$ASM_JAR:$WORK/sdk-tool-classes" SdkTool "$JDK/jmods/java.base.jmod" "$WORK/out/java-base-sdk.bin" 2>&1 \
    | grep -v '^Picked up JAVA_TOOL_OPTIONS'

# --- 5. License texts shipped with the assets ------------------------------
# javac.wasm contains OpenJDK javac (GPLv2 + Classpath Exception), TeaVM's class
# library and runtime (Apache-2.0, see TeaVM's NOTICE), teavm-javac (Apache-2.0)
# and jzlib (BSD, used by TeaVM's java.util.zip). The SDK archive is OpenJDK code.
log "Fetching license texts"
sparse_clone() {  # url tag dir paths...
    local url=$1 tag=$2 dir=$3
    shift 3
    if [ ! -d "$dir/.git" ]; then
        git clone -q --depth 1 --filter=blob:none --no-checkout --branch "$tag" "$url" "$dir"
        git -C "$dir" sparse-checkout init --no-cone
        printf '%s\n' "$@" > "$dir/.git/info/sparse-checkout"
        git -C "$dir" checkout -q "$tag"
    fi
}
sparse_clone "$TEAVM_URL" "$TEAVM_TAG" "$WORK/src/teavm-license" /LICENSE /NOTICE
[ "$(git -C "$WORK/src/teavm-license" rev-parse HEAD)" = "$TEAVM_COMMIT" ] || { echo "teavm $TEAVM_TAG is not $TEAVM_COMMIT" >&2; exit 1; }
sparse_clone "$JZLIB_URL" "$JZLIB_TAG" "$WORK/src/jzlib-license" /LICENSE.txt
LIC="$DIST/licenses"
rm -rf "$LIC"
mkdir -p "$LIC"
cp "$JDK21U/LICENSE" "$LIC/OpenJDK-LICENSE.txt"
cp "$JDK21U/ASSEMBLY_EXCEPTION" "$LIC/OpenJDK-ASSEMBLY_EXCEPTION.txt"
cp "$WORK/src/teavm-license/LICENSE" "$LIC/TeaVM-LICENSE.txt"
cp "$WORK/src/teavm-license/NOTICE" "$LIC/TeaVM-NOTICE.txt"
cp "$WORK/src/jzlib-license/LICENSE.txt" "$LIC/jzlib-LICENSE.txt"
cat > "$LIC/README.txt" <<TXT
Licenses of the code in this folder (Java Arena compiler assets)

javac.wasm, javac.wasm-runtime.js
  OpenJDK javac, $JDK21U_URL tag $JDK21U_TAG (commit $JDK21U_COMMIT), with the
  Java Arena patches: GPL-2.0 with the Classpath Exception (OpenJDK-LICENSE.txt,
  OpenJDK-ASSEMBLY_EXCEPTION.txt). Also contains code copied from OpenJDK's
  java.base (jdk.internal.math, parts of java.lang.String) under the same license.
  TeaVM $TEAVM_TAG class library and runtime, $TEAVM_URL: Apache-2.0
  (TeaVM-LICENSE.txt, TeaVM-NOTICE.txt).
  teavm-javac, $TEAVM_JAVAC_URL commit $TEAVM_JAVAC_COMMIT: Apache-2.0 (same text).
  jzlib $JZLIB_TAG, $JZLIB_URL: BSD-style (jzlib-LICENSE.txt).
  Java Arena's own wrapper code (engine/compiler/java): Apache-2.0. Its copies of
  JDK code (engine/compiler/javac-src, including MultiplyHigh) keep OpenJDK's
  GPL-2.0 with the Classpath Exception.

java-base-sdk.bin
  Class files of the java.base module of $JDK_BUILD, with method
  bodies removed: GPL-2.0 with the Classpath Exception (OpenJDK-LICENSE.txt).

Corresponding source: the pinned repositories and tags above (the JDK's source is
$JDK_SOURCE), and engine/compiler/ (build.sh, patches/) in the Java Arena repository.
TXT

# --- 6. dist ----------------------------------------------------------------
log "Writing $DIST"
mkdir -p "$DIST"
cp "$WASM_DIR/compiler.wasm" "$DIST/javac.wasm"
cp "$WASM_DIR/compiler.wasm-runtime.js" "$DIST/javac.wasm-runtime.js"
cp "$WORK/out/java-base-sdk.bin" "$DIST/java-base-sdk.bin"
cp "$HERE/javac-host.mjs" "$DIST/javac-host.mjs"

node - "$DIST" "$JDK_BUILD" "$JAVA_VERSION" <<EOF
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const [dir, jdkBuild, jdkVersion] = process.argv.slice(2);
const names = ['javac.wasm', 'javac.wasm-runtime.js', 'java-base-sdk.bin', 'javac-host.mjs'];
const files = names.map((name) => {
  const data = fs.readFileSync(path.join(dir, name));
  return {
    name,
    bytes: data.length,
    gzip9Bytes: zlib.gzipSync(data, { level: 9 }).length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };
});
const manifest = {
  description: 'Java Arena compiler: OpenJDK javac 21 as WebAssembly GC (TeaVM), with java.base platform classes',
  files,
  sources: {
    javac: { repo: '$JDK21U_URL', tag: '$JDK21U_TAG', commit: '$JDK21U_COMMIT', license: 'GPL-2.0-only WITH Classpath-exception-2.0' },
    'teavm-javac': { repo: '$TEAVM_JAVAC_URL', commit: '$TEAVM_JAVAC_COMMIT', license: 'Apache-2.0' },
    teavm: { artifacts: 'org.teavm:*:$TEAVM_TAG (Maven Central)', repo: '$TEAVM_URL', tag: '$TEAVM_TAG', commit: '$TEAVM_COMMIT', license: 'Apache-2.0' },
    jzlib: { artifacts: 'com.jcraft:jzlib:1.1.3 (Maven Central)', repo: '$JZLIB_URL', tag: '$JZLIB_TAG', license: 'BSD-3-Clause-style' },
    'java.base classes': { from: 'java.base.jmod of the reference JDK', jdkVersion, jdkBuild, jdkSource: '$JDK_SOURCE', license: 'GPL-2.0-only WITH Classpath-exception-2.0' },
    patches: 'engine/compiler/patches/ and engine/compiler/build.sh in the Java Arena repository',
    licenses: 'licenses/',
  },
};
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const f of files) console.log(f.name.padEnd(24), String(f.bytes).padStart(9), 'bytes, gzip -9', String(f.gzip9Bytes).padStart(9));
EOF

echo
echo "Build finished in $(( $(now) - T_START )) s"

if [ "$TEST" = 1 ]; then
    log "Running tests"
    node "$HERE/test/run-tests.mjs"
fi
