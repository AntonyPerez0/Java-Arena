// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.application;

import arena.fx.Session;
import java.util.List;
import java.util.Map;
import javafx.stage.Stage;

/**
 * A JavaFX program: extend it, write start, and call launch from main. launch makes the program's
 * object, calls init, then start with the first window, then replays the clicks and typing the
 * page recorded (in .arena/events.txt) on the JavaFX Application Thread, writes the windows to
 * .arena/window.json, calls stop as if the windows were closed, and returns.
 */
public abstract class Application {
    public Application() {
    }

    /** Runs the program of this class, with these command-line arguments. Only once per program. */
    public static void launch(Class<? extends Application> appClass, String... args) {
        Session.launch(appClass, args);
    }

    /** Runs the program of the class whose method calls launch (it must extend Application). */
    public static void launch(String... args) {
        StackTraceElement[] frames = new Throwable().getStackTrace();
        String caller = null;
        boolean inLaunch = false;
        for (StackTraceElement frame : frames) {
            if (frame.getClassName().equals(Application.class.getName()) && frame.getMethodName().equals("launch")) {
                inLaunch = true;
            } else if (inLaunch) {
                caller = frame.getClassName();
                break;
            }
        }
        if (caller == null) {
            throw new RuntimeException("Error: unable to determine Application class");
        }
        Class<?> type;
        try {
            ClassLoader loader = Thread.currentThread().getContextClassLoader();
            type = Class.forName(caller, false, loader != null ? loader : Application.class.getClassLoader());
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }
        if (!Application.class.isAssignableFrom(type)) {
            throw new RuntimeException("Error: " + type + " is not a subclass of javafx.application.Application");
        }
        Session.launch(type.asSubclass(Application.class), args);
    }

    /** Called before start, on the launcher thread (not the JavaFX Application Thread). Does nothing unless overridden. */
    public void init() throws Exception {
    }

    /** Builds the window: called on the JavaFX Application Thread with the first window (not shown yet). */
    public abstract void start(Stage primaryStage) throws Exception;

    /** Called when the program ends (its windows closed, or Platform.exit()). Does nothing unless overridden. */
    public void stop() throws Exception {
    }

    /** The command-line arguments given to launch. */
    public final Parameters getParameters() {
        return Session.parametersOf(this);
    }

    /** The arguments of launch: all of them (raw), the named ones (--key=value) and the others (unnamed). */
    public static abstract class Parameters {
        public Parameters() {
        }

        /** Every argument, in order. */
        public abstract List<String> getRaw();

        /** The arguments that aren't --key=value, in order. */
        public abstract List<String> getUnnamed();

        /** The --key=value arguments, by key (a key given twice keeps its last value). */
        public abstract Map<String, String> getNamed();
    }
}
