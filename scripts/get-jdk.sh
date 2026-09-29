#!/usr/bin/env bash
# Prints the path of Java Arena's reference JDK, Eclipse Temurin 21.0.10+7 for Linux x64,
# downloading it first (SHA-256 checked) if needed. CI, the fidelity scripts and the engine
# builds all use this one JDK, so expected outputs, the compiler's platform classes and the
# runner's class library come from the same build.
# Cache folder: ARENA_JDK_CACHE (default ~/.cache/java-arena).
set -euo pipefail
VERSION=21.0.10+7
FILE=OpenJDK21U-jdk_x64_linux_hotspot_21.0.10_7.tar.gz
SHA256=ea3b9bd464d6dd253e9a7accf59f7ccd2a36e4aa69640b7251e3370caef896a4
URL="https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.10%2B7/$FILE"
DIR=${ARENA_JDK_CACHE:-$HOME/.cache/java-arena}
JDK="$DIR/jdk-$VERSION"
if [ ! -x "$JDK/bin/java" ]; then
  mkdir -p "$DIR"
  curl -fsSL --retry 3 -o "$DIR/$FILE" "$URL"
  echo "$SHA256  $DIR/$FILE" | sha256sum -c - >&2
  tar -xzf "$DIR/$FILE" -C "$DIR"
  rm -f "$DIR/$FILE"
fi
echo "$JDK"
