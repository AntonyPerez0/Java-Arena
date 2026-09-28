/*
 * Copyright 2026 Java Arena contributors.
 * SPDX-License-Identifier: Apache-2.0
 */

package javaarena.javac;

import com.sun.tools.javac.main.JavaCompiler;
import com.sun.tools.javac.main.Option;
import com.sun.tools.javac.util.Context;
import com.sun.tools.javac.util.JCDiagnostic;
import com.sun.tools.javac.util.JavacMessages;
import com.sun.tools.javac.util.Log;
import com.sun.tools.javac.util.Options;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import javax.tools.Diagnostic;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;

/**
 * Runs javac the way the javac 21 command line does ("javac -d out <files>"),
 * on in-memory files, and records every diagnostic together with the exact text
 * the command line would have printed for it.
 *
 * A fresh javac Context is made for every compile, like one javac process per
 * compile; the platform classes are loaded once and shared.
 */
public final class ArenaJavac {
    private final Map<String, List<ArenaFile>> platformByPackage = new HashMap<>();
    private final Map<String, ArenaFile> platformByPath = new HashMap<>();
    private final Map<String, ArenaFile> sources = new LinkedHashMap<>();
    private final Map<String, ArenaFile> outputs = new LinkedHashMap<>();
    private final List<Diag> diagnostics = new ArrayList<>();
    private String output = "";
    private int errorCount;
    private int warningCount;
    private boolean success;

    /** One diagnostic as javac reported and printed it. */
    public static final class Diag {
        public String kind;
        public String code;
        public String file;
        public long line;
        public long column;
        public long position;
        public long startPosition;
        public long endPosition;
        public String message;
        public String formatted;
    }

    /**
     * Loads the platform classes from an archive in TeaVM's ArchiveReader format
     * (short nameLength, name, int dataLength, data), gzip-compressed or not.
     * Returns the number of entries.
     */
    public int loadPlatform(byte[] archive) throws IOException {
        byte[] data = archive;
        if (archive.length > 2 && (archive[0] & 0xff) == 0x1f && (archive[1] & 0xff) == 0x8b) {
            try (InputStream in = new GZIPInputStream(new ByteArrayInputStream(archive), 65536)) {
                data = in.readAllBytes();
            }
        }
        platformByPackage.clear();
        platformByPath.clear();
        int pos = 0;
        int count = 0;
        while (pos < data.length) {
            int nameLength = ((data[pos] & 0xff) << 8) | (data[pos + 1] & 0xff);
            pos += 2;
            String name = new String(data, pos, nameLength, StandardCharsets.UTF_8);
            pos += nameLength;
            int length = ((data[pos] & 0xff) << 24) | ((data[pos + 1] & 0xff) << 16)
                    | ((data[pos + 2] & 0xff) << 8) | (data[pos + 3] & 0xff);
            pos += 4;
            ArenaFile file = ArenaFile.platformClass(name, data, pos, length);
            pos += length;
            platformByPath.put(name, file);
            platformByPackage.computeIfAbsent(ArenaFile.packageOf(name), k -> new ArrayList<>()).add(file);
            count++;
        }
        return count;
    }

    /** Removes all sources and results of the previous compile. */
    public void reset() {
        sources.clear();
        outputs.clear();
        diagnostics.clear();
        output = "";
        errorCount = 0;
        warningCount = 0;
        success = false;
    }

    /** Adds a source file; path is relative, like "Main.java" or "shop/Item.java". */
    public void addSource(String path, String text) {
        sources.put(path, ArenaFile.source(path, text));
    }

    public boolean compile() {
        outputs.clear();
        diagnostics.clear();
        StringWriter text = new StringWriter();
        PrintWriter writer = new PrintWriter(text);
        Context context = new Context();
        context.put(Log.outKey, writer);
        context.put(Log.errKey, writer);
        context.put(JavaFileManager.class,
                new ArenaFileManager(platformByPackage, platformByPath, sources, outputs));
        // No annotation processor search (the Wasm build removes it anyway).
        Options.instance(context).put(Option.PROC, "none");
        Log log = Log.instance(context);
        new Recorder(log, writer, text, JavacMessages.instance(context).getCurrentLocale());
        JavaCompiler compiler = JavaCompiler.instance(context);
        List<JavaFileObject> files = new ArrayList<>(sources.values());
        try {
            compiler.compile(com.sun.tools.javac.util.List.from(files), com.sun.tools.javac.util.List.nil(),
                    null, com.sun.tools.javac.util.List.nil());
        } catch (RuntimeException | StackOverflowError e) {
            // javac's own Main prints a crash report here; a crash is reported as a failed compile.
            writer.println("An exception has occurred in the compiler. " + e);
            writer.flush();
            errorCount = Math.max(1, log.nerrors);
            warningCount = log.nwarnings;
            output = text.toString();
            success = false;
            return false;
        }
        writer.flush();
        errorCount = log.nerrors;
        warningCount = log.nwarnings;
        output = text.toString();
        success = errorCount == 0;
        return success;
    }

    public boolean success() {
        return success;
    }

    public int errorCount() {
        return errorCount;
    }

    public int warningCount() {
        return warningCount;
    }

    /** Everything javac 21 would have printed (it prints all diagnostics to stderr). */
    public String output() {
        return output;
    }

    public List<Diag> diagnostics() {
        return diagnostics;
    }

    public List<String> outputPaths() {
        return new ArrayList<>(outputs.keySet());
    }

    public byte[] outputFile(String path) {
        ArenaFile f = outputs.get(path);
        return f == null ? null : f.bytes();
    }

    /**
     * Sits in front of javac's default handler: whatever the default handler
     * prints for a diagnostic becomes that diagnostic's "formatted" text, and
     * diagnostics it drops (duplicates, over the error limit) are not recorded.
     */
    private final class Recorder extends Log.DiagnosticHandler {
        private final Log log;
        private final PrintWriter writer;
        private final StringWriter text;
        private final Locale locale;

        Recorder(Log log, PrintWriter writer, StringWriter text, Locale locale) {
            this.log = log;
            this.locale = locale;
            this.writer = writer;
            this.text = text;
            install(log);
        }

        @Override
        public void report(JCDiagnostic diag) {
            writer.flush();
            int before = text.getBuffer().length();
            prev.report(diag);
            writer.flush();
            StringBuffer buffer = text.getBuffer();
            if (buffer.length() == before) {
                return;
            }
            Diag d = new Diag();
            d.kind = switch (diag.getKind()) {
                case ERROR -> "error";
                case WARNING, MANDATORY_WARNING -> "warning";
                default -> "note";
            };
            d.code = diag.getCode();
            JavaFileObject source = diag.getSource();
            d.file = source == null ? null : source.getName();
            d.line = diag.getLineNumber();
            d.column = diag.getColumnNumber();
            d.position = diag.getPosition();
            d.startPosition = diag.getStartPosition();
            d.endPosition = diag.getEndPosition();
            d.message = log.getDiagnosticFormatter().formatMessage(diag, locale);
            String printed = buffer.substring(before);
            d.formatted = printed.endsWith("\n") ? printed.substring(0, printed.length() - 1) : printed;
            diagnostics.add(d);
        }
    }

    /** The result of the last compile as JSON (class bytes are fetched separately). */
    public String resultJson() {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"success\":").append(success);
        sb.append(",\"errors\":").append(errorCount);
        sb.append(",\"warnings\":").append(warningCount);
        sb.append(",\"output\":");
        quote(sb, output);
        sb.append(",\"classes\":[");
        boolean first = true;
        for (String path : outputs.keySet()) {
            if (!first) {
                sb.append(',');
            }
            first = false;
            quote(sb, path);
        }
        sb.append("],\"diagnostics\":[");
        for (int i = 0; i < diagnostics.size(); i++) {
            Diag d = diagnostics.get(i);
            if (i > 0) {
                sb.append(',');
            }
            sb.append("{\"kind\":");
            quote(sb, d.kind);
            sb.append(",\"code\":");
            quote(sb, d.code);
            sb.append(",\"file\":");
            quote(sb, d.file);
            sb.append(",\"line\":").append(d.line == Diagnostic.NOPOS ? -1 : d.line);
            sb.append(",\"column\":").append(d.column == Diagnostic.NOPOS ? -1 : d.column);
            sb.append(",\"position\":").append(d.position);
            sb.append(",\"startPosition\":").append(d.startPosition);
            sb.append(",\"endPosition\":").append(d.endPosition);
            sb.append(",\"message\":");
            quote(sb, d.message);
            sb.append(",\"formatted\":");
            quote(sb, d.formatted);
            sb.append('}');
        }
        sb.append("]}");
        return sb.toString();
    }

    private static void quote(StringBuilder sb, String s) {
        if (s == null) {
            sb.append("null");
            return;
        }
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        String hex = Integer.toHexString(c);
                        sb.append("\\u");
                        for (int k = hex.length(); k < 4; k++) {
                            sb.append('0');
                        }
                        sb.append(hex);
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
    }
}
