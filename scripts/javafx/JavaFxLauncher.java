// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.reference;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

/**
 * Runs a program that uses Java Arena's JavaFX on the reference JDK exactly as the browser engine
 * runs it: by calling its main method.
 *
 * <p>The JDK's own launcher (java Main) refuses a main class that extends
 * javafx.application.Application unless a module named javafx.graphics is in the boot layer
 * ("Error: JavaFX runtime components are missing"), and Java Arena's JavaFX is on the class path.
 * So the reference build runs such a program as
 *
 * <pre>
 * java --add-exports=java.base/sun.launcher=ALL-UNNAMED -Xbootclasspath/a:DIR -cp ... arena.reference.JavaFxLauncher Main args...
 * </pre>
 *
 * Its main method is hidden from stack traces (@Hidden is honored for classes of the boot class
 * path) and calls the program's main through a method handle (whose frames are hidden too), so
 * every stack trace, printed or caught, is the one a plain java Main gives. A main class that
 * can't be loaded or has no public static void main(String[]) goes to the JDK launcher's own
 * checks, which print their usual message and exit with 1. A failing static initializer gives the
 * same ExceptionInInitializerError as java Main.
 */
public final class JavaFxLauncher {
    private JavaFxLauncher() {
    }

    @jdk.internal.vm.annotation.Hidden
    public static void main(String[] args) throws Throwable {
        String name = args[0];
        String[] programArgs = Arrays.copyOfRange(args, 1, args.length);
        ClassLoader loader = ClassLoader.getSystemClassLoader();
        Class<?> mainClass;
        try {
            mainClass = Class.forName(name, false, loader);
        } catch (ClassNotFoundException | LinkageError e) {
            mainClass = null;
        }
        if (mainClass == null || !hasMain(mainClass)) {
            // LM_CLASS = 1: as for "java Main". It prints the message and exits.
            Class.forName("sun.launcher.LauncherHelper").getMethod("checkAndLoadMain", boolean.class, int.class, String.class).invoke(null, true, 1, name);
            throw new IllegalStateException("the JDK's launcher accepted " + name + ", which has no public static void main(String[])");
        }
        try {
            Class.forName(name, true, loader);
        } catch (Throwable e) {
            throw withoutForName(e, Collections.newSetFromMap(new IdentityHashMap<Throwable, Boolean>()));
        }
        MethodHandle main = MethodHandles.privateLookupIn(mainClass, MethodHandles.lookup()).findStatic(mainClass, "main", MethodType.methodType(void.class, String[].class));
        main.invokeExact(programArgs);
    }

    private static boolean hasMain(Class<?> c) {
        try {
            Method m = c.getMethod("main", String[].class);
            return Modifier.isStatic(m.getModifiers()) && m.getReturnType() == void.class;
        } catch (NoSuchMethodException | LinkageError e) {
            return false;
        }
    }

    /** Takes the Class.forName frames this launcher adds off the bottom of the traces of a failed initialization. */
    private static Throwable withoutForName(Throwable t, Set<Throwable> seen) {
        if (t == null || !seen.add(t)) {
            return t;
        }
        StackTraceElement[] frames = t.getStackTrace();
        int end = frames.length;
        while (end > 0 && frames[end - 1].getClassName().equals("java.lang.Class")) {
            end--;
        }
        if (end < frames.length) {
            t.setStackTrace(Arrays.copyOf(frames, end));
        }
        withoutForName(t.getCause(), seen);
        for (Throwable s : t.getSuppressed()) {
            withoutForName(s, seen);
        }
        return t;
    }
}
