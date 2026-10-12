// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Constructor;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import javafx.application.Application;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.layout.Region;
import javafx.stage.Stage;
import javafx.stage.Window;

/**
 * One run of a JavaFX program, as Application.launch drives it. The steps follow JavaFX 21:
 *
 * <ol>
 * <li>launch starts a thread named "JavaFX-Launcher" and waits for it.</li>
 * <li>The launcher starts the "JavaFX Application Thread", makes the program's Application object
 * there, and calls init() on its own thread.</li>
 * <li>start(primaryStage) runs on the JavaFX Application Thread. Then the events of
 * .arena/events.txt are applied there one by one, each after the previous one's handlers and the
 * Platform.runLater tasks they queued.</li>
 * <li>The session ends after the last event, or earlier when Platform.exit() is called or the last
 * showing window closes. The windows are then written to .arena/window.json, the tasks still
 * queued run, stop() runs, and launch returns.</li>
 * <li>Before launch returns, the toolkit exits: the tasks queued until then run, including those
 * that stop() queued and those of a constructor, init or start that failed (or of an init that
 * called Platform.exit()). Tasks those tasks queue are dropped, as runLater drops every task
 * once the toolkit has exited.</li>
 * </ol>
 *
 * An exception from the constructor, init, start or stop is printed as JavaFX prints it and thrown
 * from launch inside a RuntimeException. An exception that escapes an event handler or a task goes
 * to the thread's uncaught exception handler, which prints it, and the session goes on.
 */
public final class Session {
    /** The event list: what the page (or a test) clicked and typed, one event per line. */
    public static final String EVENTS_FILE = ".arena/events.txt";
    /** The windows at the end of the session, as JSON. */
    public static final String WINDOW_FILE = ".arena/window.json";

    private static final Object LOCK = new Object();
    private static boolean launchCalled;
    private static boolean exitCalled;
    private static boolean finished;
    private static volatile Thread fxThread;
    private static final ArrayDeque<Runnable> LATER = new ArrayDeque<Runnable>();
    /** The replay of this session's events. */
    private static Replay currentReplay;

    /** Every window shown in this session, in the order each was first shown. */
    private static final ArrayList<Window> SHOWN = new ArrayList<Window>();
    /** The same windows, the one shown last at the end. */
    private static final ArrayList<Window> SHOWN_LAST = new ArrayList<Window>();
    private static Window primary;
    private static boolean lastWindowClosed;
    private static final IdentityHashMap<Scene, Window> SCENE_WINDOWS = new IdentityHashMap<Scene, Window>();
    private static final IdentityHashMap<Scene, double[]> SCENE_SIZES = new IdentityHashMap<Scene, double[]>();
    private static final IdentityHashMap<Application, Application.Parameters> PARAMETERS = new IdentityHashMap<Application, Application.Parameters>();

    private Session() {
    }

    // ------------------------------------------------------------------ launch

    /** Application.launch: runs the whole session and returns when it is over. */
    public static void launch(Class<? extends Application> appClass, String[] args) {
        if (fxThread != null && Thread.currentThread() == fxThread) {
            throw new IllegalStateException("Application launch must not be called on the JavaFX Application Thread");
        }
        synchronized (LOCK) {
            if (launchCalled) {
                throw new IllegalStateException("Application launch must not be called more than once");
            }
            launchCalled = true;
        }
        Launch launch = new Launch(appClass, args == null ? new String[0] : args.clone());
        // Made without a name and named afterwards, as JavaFX makes it: it takes a number of the
        // threads without a name, so a program's own first one is Thread-2 after launch, as there.
        Thread launcher = new Thread(launch);
        launcher.setName("JavaFX-Launcher");
        launcher.start();
        try {
            launcher.join();
        } catch (InterruptedException e) {
            throw new RuntimeException("Launcher thread interrupted", e);
        }
        if (launch.failure != null) {
            throw launch.failure;
        }
    }

    /** The launcher thread's work. */
    private static final class Launch implements Runnable {
        private final Class<? extends Application> appClass;
        private final String[] args;
        RuntimeException failure;
        Application app;
        Throwable constructorError;
        Throwable startError;
        Throwable stopError;

        Launch(Class<? extends Application> appClass, String[] args) {
            this.appClass = appClass;
            this.args = args;
        }

        @Override
        public void run() {
            try {
                session();
            } catch (RuntimeException e) {
                failure = e;
            } catch (Error e) {
                failure = new RuntimeException("Application launch error", e);
            }
        }

        private void session() {
            synchronized (LOCK) {
                if (exitCalled) {
                    finished = true;
                    throw new IllegalStateException("Platform.exit has been called");
                }
            }
            final List<EventLine> events = EventParser.parse(readEvents());
            final Replay replay = new Replay();
            currentReplay = replay;
            FxThread fx = new FxThread();
            fxThread = fx.thread;
            fx.thread.start();
            try {
                fx.call(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Constructor<? extends Application> c = appClass.getConstructor();
                            app = c.newInstance();
                            synchronized (LOCK) {
                                PARAMETERS.put(app, new Params(args));
                            }
                        } catch (Throwable t) {
                            System.err.println("Exception in Application constructor");
                            constructorError = t;
                        }
                    }
                });
                if (constructorError != null) {
                    throw new RuntimeException("Unable to construct Application instance: " + appClass, constructorError);
                }
                try {
                    app.init();
                } catch (Throwable t) {
                    System.err.println("Exception in Application init method");
                    throw new RuntimeException("Exception in Application init method", t);
                }
                if (exitRequested()) {
                    // As in JavaFX: Platform.exit() in init means start and stop aren't called.
                    writeWindow(replay);
                    return;
                }
                fx.call(new Runnable() {
                    @Override
                    public void run() {
                        drain();
                        Stage stage = new Stage();
                        primary = stage;
                        try {
                            app.start(stage);
                        } catch (Throwable t) {
                            System.err.println("Exception in Application start method");
                            startError = t;
                            return;
                        }
                        drain();
                        replay.settle();
                        int step = 0;
                        for (EventLine event : events) {
                            if (replay.ended) {
                                break;
                            }
                            replay.apply(event);
                            drain();
                            replay.settle();
                            step++;
                            if (STEP_WINDOWS && !replay.ended) {
                                writeWindow(replay, ".arena/window-step-" + step + ".json");
                            }
                        }
                        writeWindow(replay);
                    }
                });
                fx.call(new Runnable() {
                    @Override
                    public void run() {
                        // Tasks still queued run first, as they do in JavaFX before stop.
                        drain();
                        try {
                            app.stop();
                        } catch (Throwable t) {
                            System.err.println("Exception in Application stop method");
                            stopError = t;
                        }
                    }
                });
                if (startError != null) {
                    throw new RuntimeException("Exception in Application start method", startError);
                }
                if (stopError != null) {
                    throw new RuntimeException("Exception in Application stop method", stopError);
                }
            } finally {
                // The toolkit exits, as JavaFX's does after stop() (or after a constructor, init or
                // start that failed, or an init that called Platform.exit()): from here runLater
                // drops new tasks, and the tasks already queued, such as those stop() queued, still
                // run. A task one of them queues is dropped.
                synchronized (LOCK) {
                    finished = true;
                }
                fx.call(new Runnable() {
                    @Override
                    public void run() {
                        drain();
                    }
                });
                fx.quit();
            }
        }
    }

    /**
     * The JavaFX Application Thread: it runs what the launcher hands it, one piece at a time, and
     * the launcher waits for each.
     */
    private static final class FxThread implements Runnable {
        final Thread thread = named(new Thread(this), "JavaFX Application Thread");
        private Runnable task;
        private boolean quit;

        @Override
        public void run() {
            while (true) {
                Runnable next;
                synchronized (this) {
                    while (task == null && !quit) {
                        waitHere();
                    }
                    if (task == null) {
                        return;
                    }
                    next = task;
                }
                try {
                    next.run();
                } catch (Throwable t) {
                    uncaught(t);
                }
                synchronized (this) {
                    task = null;
                    notifyAll();
                }
            }
        }

        /** Names a thread made without a name (which took a number, as JavaFX's own threads do). */
        private static Thread named(Thread t, String name) {
            t.setName(name);
            return t;
        }

        synchronized void call(Runnable r) {
            task = r;
            notifyAll();
            while (task != null) {
                waitHere();
            }
        }

        void quit() {
            synchronized (this) {
                quit = true;
                notifyAll();
            }
            while (true) {
                try {
                    thread.join();
                    return;
                } catch (InterruptedException e) {
                    // Keep waiting: the session is over only when the thread is.
                }
            }
        }

        private void waitHere() {
            try {
                wait();
            } catch (InterruptedException e) {
                // Spurious for this handoff: check the condition again.
            }
        }
    }

    private static String readEvents() {
        File file = new File(EVENTS_FILE);
        if (!file.isFile()) {
            return "";
        }
        try (InputStream in = new FileInputStream(file)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }

    /**
     * Only for npm run fx-check, which sets the system property arena.fx.stepWindows on the
     * reference JDK: the window after each event line (while the session goes on) is also written,
     * as .arena/window-step-N.json for the N-th line, so the check compares the window after every
     * line with real JavaFX's. Never set on the site.
     */
    private static final boolean STEP_WINDOWS = stepWindows();

    private static boolean stepWindows() {
        try {
            return System.getProperty("arena.fx.stepWindows") != null;
        } catch (Throwable t) {
            return false;
        }
    }

    private static void writeWindow(Replay replay) {
        writeWindow(replay, WINDOW_FILE);
    }

    private static void writeWindow(Replay replay, String name) {
        boolean closed = replay.closed || exitRequested();
        byte[] json = WindowJson.write(closed ? new ArrayList<Window>() : showingWindows(), closed, replay.problems).getBytes(StandardCharsets.US_ASCII);
        File folder = new File(EVENTS_FILE).getParentFile();
        folder.mkdirs();
        try (OutputStream out = new FileOutputStream(new File(name))) {
            out.write(json);
        } catch (IOException e) {
            // The page then shows no window: there is nothing better to do here.
        }
    }

    // ------------------------------------------------------------------ the replay

    /** Applies the events, and knows when the session has ended. */
    private static final class Replay {
        final List<String> problems = new ArrayList<String>();
        final Mouse mouse = new Mouse();
        boolean ended;
        boolean closed;

        /** Ends the session after Platform.exit(), or when the last showing window has closed. */
        void settle() {
            if (ended) {
                return;
            }
            // Where JavaFX's next pulse would lay the showing windows out.
            Charts.layoutShowing(showingWindows());
            boolean none = showingWindows().isEmpty();
            synchronized (LOCK) {
                if (exitCalled || (lastWindowClosed && none)) {
                    ended = true;
                    closed = true;
                }
            }
        }

        void apply(EventLine event) {
            String problem = event.problem;
            if (problem == null) {
                try {
                    if (event.command.equals("frames")) {
                        problem = frames(Integer.parseInt(event.number));
                    } else if (event.target == null && !event.command.equals("close")) {
                        problem = Keys.apply(event);
                    } else {
                        problem = Targets.apply(event, showingWindows(), primary, mouse);
                    }
                } catch (Throwable t) {
                    uncaught(t);
                }
            }
            if (problem != null) {
                problems.add(event.text + ": " + problem);
            }
        }
    }

    /**
     * Runs n frames, as JavaFX's pulses would: in each, the started timers (Frames.runOne), then the
     * frame is recorded as it would be drawn, then the runLater tasks queued meanwhile run and the
     * windows are laid out. Frames stop early when the session ends.
     */
    private static String frames(int n) {
        if (showingWindows().isEmpty()) {
            return "no window is open";
        }
        for (int i = 0; i < n; i++) {
            Frames.runOne();
            Frames.record(showingWindows());
            drain();
            currentReplay.settle();
            if (currentReplay.ended) {
                break;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------ Platform

    /**
     * Queues a task. As in JavaFX, a null task is accepted and fails when its turn comes (with the
     * NullPointerException JavaFX's own code gives).
     */
    public static void runLater(Runnable task) {
        synchronized (LOCK) {
            if (!launchCalled) {
                throw new IllegalStateException("Toolkit not initialized");
            }
            if (!finished) {
                LATER.add(task == null ? NULL_TASK : task);
            }
        }
    }

    /** What runLater(null) queues. */
    private static final Runnable NULL_TASK = new Runnable() {
        @Override
        public void run() {
            throw new NullPointerException("Cannot invoke \"java.lang.Runnable.run()\" because \"<parameter1>\" is null");
        }
    };

    public static void exit() {
        synchronized (LOCK) {
            if (!finished) {
                exitCalled = true;
            }
        }
    }

    static boolean exitRequested() {
        synchronized (LOCK) {
            return exitCalled;
        }
    }

    public static boolean isFxThread() {
        return fxThread != null && Thread.currentThread() == fxThread;
    }

    /** Runs the queued runLater tasks (and the ones they queue), in order. */
    static void drain() {
        while (true) {
            Runnable task;
            synchronized (LOCK) {
                task = LATER.poll();
            }
            if (task == null) {
                return;
            }
            try {
                task.run();
            } catch (Throwable t) {
                uncaught(t);
            }
        }
    }

    /** An exception that escaped an event handler, a task or a listener: printed by the thread's handler, as in JavaFX. */
    public static void uncaught(Throwable t) {
        Thread thread = Thread.currentThread();
        thread.getUncaughtExceptionHandler().uncaughtException(thread, t);
    }

    // ------------------------------------------------------------------ threads

    /** Windows can be made, shown and hidden only on the JavaFX Application Thread. */
    public static void checkFxThread() {
        if (!isFxThread()) {
            throw new IllegalStateException("Not on FX application thread; currentThread = " + Thread.currentThread().getName());
        }
    }

    /** A pane in a showing window can be changed only on the JavaFX Application Thread. */
    public static void checkSceneThread(Parent parent) {
        if (fxThread == null || isFxThread()) {
            return;
        }
        Scene scene = parent.getScene();
        Window window = scene == null ? null : windowOf(scene);
        if (window != null && window.isShowing()) {
            throw new IllegalStateException("Not on FX application thread; currentThread = " + Thread.currentThread().getName());
        }
    }

    // ------------------------------------------------------------------ windows and scenes

    public static void shown(Window window) {
        Scene scene = window.getScene();
        synchronized (LOCK) {
            if (!SHOWN.contains(window)) {
                SHOWN.add(window);
            }
            SHOWN_LAST.remove(window);
            SHOWN_LAST.add(window);
            lastWindowClosed = false;
            // As JavaFX sizes a scene made without a size when its window shows: the root pane's
            // preferred size (known here only when both were set).
            if (scene != null && !SCENE_SIZES.containsKey(scene) && scene.getRoot() instanceof Region) {
                Region root = (Region) scene.getRoot();
                if (root.getPrefWidth() >= 0 && root.getPrefHeight() >= 0) {
                    SCENE_SIZES.put(scene, new double[] { root.getPrefWidth(), root.getPrefHeight() });
                }
            }
        }
    }

    /**
     * The window key events go to: the one shown last that still shows (JavaFX gives a window
     * the focus when it shows), or null.
     */
    static Window focusedWindow() {
        synchronized (LOCK) {
            for (int i = SHOWN_LAST.size() - 1; i >= 0; i--) {
                if (SHOWN_LAST.get(i).isShowing()) {
                    return SHOWN_LAST.get(i);
                }
            }
            return null;
        }
    }

    public static void hidden(Window window) {
        if (showingWindows().isEmpty()) {
            synchronized (LOCK) {
                lastWindowClosed = true;
            }
        }
    }

    /** The showing windows: the primary stage first, then the others in the order they were first shown. */
    static List<Window> showingWindows() {
        List<Window> list = new ArrayList<Window>();
        synchronized (LOCK) {
            if (primary != null && primary.isShowing()) {
                list.add(primary);
            }
            for (Window w : SHOWN) {
                if (w != primary && w.isShowing()) {
                    list.add(w);
                }
            }
        }
        return list;
    }

    public static Window windowOf(Scene scene) {
        synchronized (LOCK) {
            return SCENE_WINDOWS.get(scene);
        }
    }

    public static void setWindowOf(Scene scene, Window window) {
        synchronized (LOCK) {
            if (window == null) {
                SCENE_WINDOWS.remove(scene);
            } else {
                SCENE_WINDOWS.put(scene, window);
            }
        }
    }

    /** Records the size a scene was made with (written to the window JSON only when given). */
    public static void sceneSized(Scene scene, double width, double height) {
        synchronized (LOCK) {
            SCENE_SIZES.put(scene, new double[] { width, height });
        }
    }

    /** { width, height } given to the scene's constructor (or taken from its root pane as its window first showed), or null. */
    public static double[] sceneSize(Scene scene) {
        synchronized (LOCK) {
            return SCENE_SIZES.get(scene);
        }
    }

    public static Application.Parameters parametersOf(Application app) {
        synchronized (LOCK) {
            return PARAMETERS.get(app);
        }
    }
}
