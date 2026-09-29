/*
 * Copyright 2026 Java Arena contributors.
 * SPDX-License-Identifier: Apache-2.0
 */

package javaarena.javac;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.ServiceLoader;
import java.util.Set;
import javax.tools.FileObject;
import javax.tools.JavaFileManager;
import javax.tools.JavaFileObject;
import javax.tools.StandardLocation;

/**
 * Models what javac 21 sees when run as "javac -d out Main.java shop/Item.java"
 * in a directory that holds only the given sources:
 * - SYSTEM_MODULES holds one module, java.base (the SDK archive);
 * - CLASS_PATH is "." and so holds the source files (no -sourcepath given,
 *   so javac also looks for sources there);
 * - CLASS_OUTPUT is an in-memory map, cleared before every compile.
 */
final class ArenaFileManager implements JavaFileManager {
    static final Location JAVA_BASE = new Location() {
        @Override
        public String getName() {
            return "SYSTEM_MODULES[java.base]";
        }

        @Override
        public boolean isOutputLocation() {
            return false;
        }

        @Override
        public boolean isModuleOrientedLocation() {
            return false;
        }

        @Override
        public String toString() {
            return getName();
        }
    };

    private final Map<String, List<ArenaFile>> platformByPackage;
    private final Map<String, ArenaFile> platformByPath;
    private final Map<String, ArenaFile> sources;
    private final Map<String, ArenaFile> outputs;

    ArenaFileManager(Map<String, List<ArenaFile>> platformByPackage, Map<String, ArenaFile> platformByPath,
            Map<String, ArenaFile> sources, Map<String, ArenaFile> outputs) {
        this.platformByPackage = platformByPackage;
        this.platformByPath = platformByPath;
        this.sources = sources;
        this.outputs = outputs;
    }

    @Override
    public ClassLoader getClassLoader(Location location) {
        return null;
    }

    @Override
    public Iterable<JavaFileObject> list(Location location, String packageName, Set<JavaFileObject.Kind> kinds,
            boolean recurse) {
        List<JavaFileObject> result = new ArrayList<>();
        if (location == JAVA_BASE) {
            if (recurse) {
                String prefix = packageName.isEmpty() ? "" : packageName + ".";
                for (var e : platformByPackage.entrySet()) {
                    if (e.getKey().equals(packageName) || e.getKey().startsWith(prefix)) {
                        addMatching(result, e.getValue(), kinds);
                    }
                }
            } else {
                List<ArenaFile> files = platformByPackage.get(packageName);
                if (files != null) {
                    addMatching(result, files, kinds);
                }
            }
        } else if (location == StandardLocation.CLASS_PATH) {
            for (ArenaFile f : sources.values()) {
                String pkg = ArenaFile.packageOf(f.path);
                if (pkg.equals(packageName) || recurse && (packageName.isEmpty() || pkg.startsWith(packageName + "."))) {
                    if (kinds.contains(f.kind)) {
                        result.add(f);
                    }
                }
            }
        }
        return result;
    }

    private static void addMatching(List<JavaFileObject> result, List<ArenaFile> files,
            Set<JavaFileObject.Kind> kinds) {
        for (ArenaFile f : files) {
            if (kinds.contains(f.kind)) {
                result.add(f);
            }
        }
    }

    @Override
    public String inferBinaryName(Location location, JavaFileObject file) {
        return file instanceof ArenaFile f ? f.binaryName() : null;
    }

    @Override
    public boolean isSameFile(FileObject a, FileObject b) {
        return a == b;
    }

    @Override
    public boolean handleOption(String current, Iterator<String> remaining) {
        return false;
    }

    @Override
    public boolean hasLocation(Location location) {
        return location == StandardLocation.SYSTEM_MODULES
                || location == StandardLocation.CLASS_PATH
                || location == StandardLocation.CLASS_OUTPUT;
    }

    @Override
    public JavaFileObject getJavaFileForInput(Location location, String className, JavaFileObject.Kind kind) {
        return getFileForInput(location, "", className.replace('.', '/') + kind.extension);
    }

    @Override
    public JavaFileObject getJavaFileForOutput(Location location, String className, JavaFileObject.Kind kind,
            FileObject sibling) {
        return getFileForOutput(location, "", className.replace('.', '/') + kind.extension, sibling);
    }

    private static String path(String packageName, String relativeName) {
        return packageName.isEmpty() ? relativeName : packageName.replace('.', '/') + "/" + relativeName;
    }

    @Override
    public ArenaFile getFileForInput(Location location, String packageName, String relativeName) {
        String path = path(packageName, relativeName);
        if (location == JAVA_BASE) {
            return platformByPath.get(path);
        } else if (location == StandardLocation.CLASS_PATH) {
            return sources.get(path);
        } else if (location == StandardLocation.CLASS_OUTPUT) {
            return outputs.get(path);
        }
        return null;
    }

    @Override
    public ArenaFile getFileForOutput(Location location, String packageName, String relativeName,
            FileObject sibling) {
        if (location != StandardLocation.CLASS_OUTPUT) {
            return null;
        }
        String path = path(packageName, relativeName);
        ArenaFile f = ArenaFile.output(path);
        outputs.put(path, f);
        return f;
    }

    @Override
    public void flush() {
    }

    @Override
    public void close() {
    }

    @Override
    public int isSupportedOption(String option) {
        return -1;
    }

    @Override
    public boolean contains(Location location, FileObject fo) {
        if (!(fo instanceof ArenaFile f)) {
            return false;
        }
        if (location == JAVA_BASE) {
            return f.platform;
        } else if (location == StandardLocation.CLASS_PATH) {
            return sources.get(f.path) == f;
        } else if (location == StandardLocation.CLASS_OUTPUT) {
            return outputs.get(f.path) == f;
        }
        return false;
    }

    @Override
    public Iterable<Set<Location>> listLocationsForModules(Location location) {
        if (location == StandardLocation.SYSTEM_MODULES) {
            return List.of(Set.of(JAVA_BASE));
        }
        return Collections.emptyList();
    }

    @Override
    public Location getLocationForModule(Location location, String moduleName) {
        if (location == StandardLocation.SYSTEM_MODULES && moduleName.equals("java.base")) {
            return JAVA_BASE;
        }
        return null;
    }

    @Override
    public Location getLocationForModule(Location location, JavaFileObject fo) {
        if (location == StandardLocation.SYSTEM_MODULES && fo instanceof ArenaFile f && f.platform) {
            return JAVA_BASE;
        }
        return null;
    }

    @Override
    public String inferModuleName(Location location) {
        return location == JAVA_BASE ? "java.base" : null;
    }

    @Override
    public <S> ServiceLoader<S> getServiceLoader(Location location, Class<S> service) {
        throw new UnsupportedOperationException("service loading is not supported");
    }
}
