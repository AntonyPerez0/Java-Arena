/*
 * Java Arena SDK tool: builds the "platform classes" archive that the in-browser
 * javac compiles against, from java.base.jmod of a real JDK.
 *
 * Every class file of java.base is kept, with method bodies (Code), debug
 * attributes, stack maps and bootstrap methods removed. Signatures, generic
 * Signature attributes, annotations (visible and invisible), ConstantValue,
 * InnerClasses, EnclosingMethod, NestHost/NestMembers, PermittedSubclasses,
 * Record, AnnotationDefault and Exceptions are kept, and so are private
 * members, because javac 21 reports "x has private access in Y" (instead of
 * "cannot find symbol") only when it can see them. module-info.class is copied
 * unchanged.
 *
 * Output: TeaVM ArchiveReader format, a gzip stream of entries
 *   short nameLength, UTF-8 name bytes, int dataLength, data
 * sorted by entry name, with a fixed gzip header so the output is reproducible.
 *
 * Usage: java -cp asm.jar:. SdkTool <java.base.jmod> <out.bin> [--drop-private] [--drop-local]
 * The two --drop flags exist only to measure what they would save.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.TreeMap;
import java.util.zip.CRC32;
import java.util.zip.Deflater;
import java.util.zip.DeflaterOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.FieldVisitor;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;

public class SdkTool {
    private static boolean dropPrivate;
    private static boolean dropLocal;

    public static void main(String[] args) throws IOException {
        if (args.length < 2) {
            System.err.println("usage: SdkTool <java.base.jmod> <out.bin> [--drop-private] [--drop-local]");
            System.exit(2);
        }
        for (int i = 2; i < args.length; i++) {
            switch (args[i]) {
                case "--drop-private" -> dropPrivate = true;
                case "--drop-local" -> dropLocal = true;
                default -> throw new IllegalArgumentException(args[i]);
            }
        }
        Map<String, byte[]> entries = new TreeMap<>();
        long inBytes = 0;
        int classes = 0;
        try (InputStream raw = Files.newInputStream(Path.of(args[0]))) {
            byte[] magic = raw.readNBytes(4);
            if (magic.length != 4 || magic[0] != 'J' || magic[1] != 'M') {
                throw new IOException("not a jmod file: " + args[0]);
            }
            ZipInputStream zip = new ZipInputStream(raw);
            ZipEntry e;
            while ((e = zip.getNextEntry()) != null) {
                String name = e.getName();
                if (!name.startsWith("classes/") || !name.endsWith(".class")) {
                    continue;
                }
                name = name.substring("classes/".length());
                byte[] data = zip.readAllBytes();
                inBytes += data.length;
                classes++;
                if (name.equals("module-info.class")) {
                    entries.put(name, data);
                    continue;
                }
                byte[] stripped = strip(data);
                if (stripped != null) {
                    entries.put(name, stripped);
                }
            }
        }
        ByteArrayOutputStream payload = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(payload);
        long outBytes = 0;
        for (var entry : entries.entrySet()) {
            byte[] name = entry.getKey().getBytes(StandardCharsets.UTF_8);
            out.writeShort(name.length);
            out.write(name);
            out.writeInt(entry.getValue().length);
            out.write(entry.getValue());
            outBytes += entry.getValue().length;
        }
        out.flush();
        byte[] gz = gzip(payload.toByteArray());
        Files.write(Path.of(args[1]), gz);
        System.out.printf("SdkTool: %d class files (%d bytes) -> %d entries (%d bytes of class data,"
                + " %d bytes archive payload, %d bytes gzip)%n",
                classes, inBytes, entries.size(), outBytes, payload.size(), gz.length);
    }

    static byte[] strip(byte[] data) {
        ClassReader reader = new ClassReader(data);
        if (dropLocal && isLocalOrAnonymous(reader)) {
            return null;
        }
        ClassWriter writer = new ClassWriter(0);
        reader.accept(new ClassVisitor(Opcodes.ASM9, writer) {
            @Override
            public FieldVisitor visitField(int access, String name, String descriptor, String signature,
                    Object value) {
                if (dropPrivate && (access & Opcodes.ACC_PRIVATE) != 0 || neverEntered(access, name)) {
                    return null;
                }
                return super.visitField(access, name, descriptor, signature, value);
            }

            @Override
            public MethodVisitor visitMethod(int access, String name, String descriptor, String signature,
                    String[] exceptions) {
                if (dropPrivate && (access & Opcodes.ACC_PRIVATE) != 0 || neverEntered(access, name)) {
                    return null;
                }
                return super.visitMethod(access, name, descriptor, signature, exceptions);
            }
        }, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
        return writer.toByteArray();
    }

    // javac's ClassReader.enterMember never enters synthetic members that are not bridges,
    // except lambda bodies, so dropping them cannot change what javac sees.
    static boolean neverEntered(int access, String name) {
        return (access & (Opcodes.ACC_SYNTHETIC | Opcodes.ACC_BRIDGE)) == Opcodes.ACC_SYNTHETIC
                && !name.startsWith("lambda$");
    }

    static boolean isLocalOrAnonymous(ClassReader reader) {
        boolean[] local = new boolean[1];
        reader.accept(new ClassVisitor(Opcodes.ASM9) {
            @Override
            public void visitOuterClass(String owner, String name, String descriptor) {
                local[0] = true;
            }
        }, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
        return local[0];
    }

    // gzip with mtime 0 and no file name, so identical input gives identical bytes.
    static byte[] gzip(byte[] data) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        bytes.write(new byte[] {0x1f, (byte) 0x8b, 8, 0, 0, 0, 0, 0, 2, 3});
        Deflater deflater = new Deflater(9, true);
        try (OutputStream def = new DeflaterOutputStream(new NonClosing(bytes), deflater, 65536)) {
            def.write(data);
        }
        deflater.end();
        CRC32 crc = new CRC32();
        crc.update(data);
        writeIntLE(bytes, (int) crc.getValue());
        writeIntLE(bytes, data.length);
        return bytes.toByteArray();
    }

    static void writeIntLE(OutputStream out, int v) throws IOException {
        out.write(v);
        out.write(v >>> 8);
        out.write(v >>> 16);
        out.write(v >>> 24);
    }

    static final class NonClosing extends java.io.FilterOutputStream {
        NonClosing(OutputStream out) {
            super(out);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            out.write(b, off, len);
        }

        @Override
        public void close() throws IOException {
            flush();
        }
    }
}
