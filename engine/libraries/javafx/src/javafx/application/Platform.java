// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.application;

import arena.fx.Session;

/** The JavaFX runtime: its thread, tasks to run on it, and ending the program. */
public final class Platform {
    private Platform() {
    }

    /** Runs the task on the JavaFX Application Thread after the current event, in the order the tasks were given. */
    public static void runLater(Runnable runnable) {
        Session.runLater(runnable);
    }

    /** Ends the program's session: later clicks and typing are ignored, the windows close and stop() is called. */
    public static void exit() {
        Session.exit();
    }

    /** Whether the code calling it runs on the JavaFX Application Thread. */
    public static boolean isFxApplicationThread() {
        return Session.isFxThread();
    }
}
