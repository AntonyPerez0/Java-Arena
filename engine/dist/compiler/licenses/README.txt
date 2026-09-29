Licenses of the code in this folder (Java Arena compiler assets)

javac.wasm, javac.wasm-runtime.js
  OpenJDK javac, https://github.com/openjdk/jdk21u tag jdk-21.0.10+7 (commit 97a3d2372d457c5a72413df14bf08cf99545c695), with the
  Java Arena patches: GPL-2.0 with the Classpath Exception (OpenJDK-LICENSE.txt,
  OpenJDK-ASSEMBLY_EXCEPTION.txt). Also contains code copied from OpenJDK's
  java.base (jdk.internal.math, parts of java.lang.String) under the same license.
  TeaVM 0.13.1 class library and runtime, https://github.com/konsoletyper/teavm: Apache-2.0
  (TeaVM-LICENSE.txt, TeaVM-NOTICE.txt).
  teavm-javac, https://github.com/konsoletyper/teavm-javac commit 2ddcf02e4983e5c74d45b945c2fd41a829358828: Apache-2.0 (same text).
  jzlib 1.1.3, https://github.com/ymnk/jzlib: BSD-style (jzlib-LICENSE.txt).
  Java Arena's own wrapper code (engine/compiler/java): Apache-2.0. Its copies of
  JDK code (engine/compiler/javac-src, including MultiplyHigh) keep OpenJDK's
  GPL-2.0 with the Classpath Exception.

java-base-sdk.bin
  Class files of the java.base module of Eclipse Adoptium Temurin-21.0.10+7 (java.runtime.version 21.0.10+7-LTS), with method
  bodies removed: GPL-2.0 with the Classpath Exception (OpenJDK-LICENSE.txt).

Corresponding source: the pinned repositories and tags above (the JDK's source is
https://github.com/adoptium/jdk21u tag jdk-21.0.10+7), and engine/compiler/ (build.sh, patches/) in the Java Arena repository.
