/*
 * Copyright 2026 Java Arena contributors.
 * SPDX-License-Identifier: Apache-2.0
 */

import java.nio.file.Files;
import java.nio.file.Path;
import javaarena.javac.ArenaJavac;

/**
 * Runs the ArenaJavac wrapper on HotSpot (with the JDK's own javac), to test the
 * wrapper apart from TeaVM. Usage: JvmDriver <sdk.bin> <outDir> <srcRoot> <file>...
 * Prints the result JSON and writes class files under outDir.
 */
public class JvmDriver {
    public static void main(String[] args) throws Exception {
        ArenaJavac javac = new ArenaJavac();
        javac.loadPlatform(Files.readAllBytes(Path.of(args[0])));
        Path out = Path.of(args[1]);
        Path root = Path.of(args[2]);
        for (int i = 3; i < args.length; i++) {
            javac.addSource(args[i], Files.readString(root.resolve(args[i])));
        }
        javac.compile();
        for (String p : javac.outputPaths()) {
            Path target = out.resolve(p);
            Files.createDirectories(target.getParent());
            Files.write(target, javac.outputFile(p));
        }
        System.out.println(javac.resultJson());
    }
}
