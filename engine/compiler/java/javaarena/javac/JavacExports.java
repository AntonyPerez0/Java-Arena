/*
 * Copyright 2026 Java Arena contributors.
 * SPDX-License-Identifier: Apache-2.0
 */

package javaarena.javac;

import java.io.IOException;
import org.teavm.jso.JSExport;
import org.teavm.jso.typedarrays.Int8Array;

/**
 * The functions javac.wasm exports to JavaScript (TeaVM entry point). One
 * compiler per module instance; javac-host.mjs wraps these in a friendlier API.
 */
public final class JavacExports {
    private static final ArenaJavac JAVAC = new ArenaJavac();

    private JavacExports() {
    }

    /** Loads the platform classes archive (java-base-sdk.bin). Returns the entry count. */
    @JSExport
    public static int loadPlatform(Int8Array archive) throws IOException {
        return JAVAC.loadPlatform(archive.copyToJavaArray());
    }

    /** Forgets the sources and results of the previous compile. */
    @JSExport
    public static void reset() {
        JAVAC.reset();
    }

    @JSExport
    public static void addSource(String path, String text) {
        JAVAC.addSource(path, text);
    }

    /** Compiles the added sources; returns the result as JSON (see ArenaJavac.resultJson). */
    @JSExport
    public static String compile() {
        JAVAC.compile();
        return JAVAC.resultJson();
    }

    /** Bytes of an output class file of the last compile, such as "shop/Item.class", or null. */
    @JSExport
    public static Int8Array classFile(String path) {
        byte[] data = JAVAC.outputFile(path);
        return data == null ? null : Int8Array.copyFromJavaArray(data);
    }
}
