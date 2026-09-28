/*
 * Copyright 2026 Java Arena contributors.
 * SPDX-License-Identifier: Apache-2.0
 */

package javaarena.javac;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.StringReader;
import java.io.Writer;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.NestingKind;
import javax.tools.JavaFileObject;

/**
 * An in-memory file: a source file (text), a platform class file (a slice of the
 * SDK archive) or an output class file.
 */
final class ArenaFile implements JavaFileObject {
    final String path;
    final Kind kind;
    final boolean platform;
    private String text;
    private byte[] data;
    private int offset;
    private int length;

    private ArenaFile(String path, boolean platform) {
        this.path = path;
        this.platform = platform;
        this.kind = kindOf(path);
    }

    static ArenaFile source(String path, String text) {
        ArenaFile f = new ArenaFile(path, false);
        f.text = text;
        return f;
    }

    static ArenaFile platformClass(String path, byte[] data, int offset, int length) {
        ArenaFile f = new ArenaFile(path, true);
        f.data = data;
        f.offset = offset;
        f.length = length;
        return f;
    }

    static ArenaFile output(String path) {
        ArenaFile f = new ArenaFile(path, false);
        f.data = new byte[0];
        return f;
    }

    static Kind kindOf(String path) {
        for (Kind k : Kind.values()) {
            if (!k.extension.isEmpty() && path.endsWith(k.extension)) {
                return k;
            }
        }
        return Kind.OTHER;
    }

    /** Package part of the path, with dots: "shop/Item.java" gives "shop". */
    static String packageOf(String path) {
        int slash = path.lastIndexOf('/');
        return slash < 0 ? "" : path.substring(0, slash).replace('/', '.');
    }

    String baseName() {
        return path.substring(path.lastIndexOf('/') + 1);
    }

    /** Binary name for a class or source file: "shop/Item.java" gives "shop.Item". */
    String binaryName() {
        String p = path.substring(0, path.length() - kind.extension.length());
        return p.replace('/', '.');
    }

    byte[] bytes() {
        if (offset == 0 && length == data.length) {
            return data;
        }
        byte[] copy = new byte[length];
        System.arraycopy(data, offset, copy, 0, length);
        return copy;
    }

    @Override
    public Kind getKind() {
        return kind;
    }

    // Same rule as javac's own file objects: the file's base name must be simpleName + extension.
    @Override
    public boolean isNameCompatible(String simpleName, Kind kind) {
        return this.kind == kind && baseName().equals(simpleName + kind.extension);
    }

    @Override
    public NestingKind getNestingKind() {
        return null;
    }

    @Override
    public Modifier getAccessLevel() {
        return null;
    }

    @Override
    public URI toUri() {
        return URI.create("arena:/" + path);
    }

    @Override
    public String getName() {
        return path;
    }

    @Override
    public InputStream openInputStream() {
        if (text != null) {
            return new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8));
        }
        return new ByteArrayInputStream(data, offset, length);
    }

    @Override
    public OutputStream openOutputStream() {
        return new ByteArrayOutputStream() {
            @Override
            public void close() {
                data = toByteArray();
                offset = 0;
                length = data.length;
            }
        };
    }

    @Override
    public Reader openReader(boolean ignoreEncodingErrors) {
        return new StringReader(getCharContent(ignoreEncodingErrors).toString());
    }

    @Override
    public CharSequence getCharContent(boolean ignoreEncodingErrors) {
        if (text != null) {
            return text;
        }
        return new String(data, offset, length, StandardCharsets.UTF_8);
    }

    @Override
    public Writer openWriter() {
        return new OutputStreamWriter(openOutputStream(), StandardCharsets.UTF_8);
    }

    @Override
    public long getLastModified() {
        return 0;
    }

    @Override
    public boolean delete() {
        return false;
    }

    @Override
    public String toString() {
        return path;
    }
}
