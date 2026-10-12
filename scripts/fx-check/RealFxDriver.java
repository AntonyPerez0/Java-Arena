// Part of Java Arena's real-JavaFX check (npm run fx-check): written for this site, not OpenJFX's code.
package arena.fxcheck;

import java.io.File;
import java.io.IOException;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.CRC32;
import javafx.application.Platform;
import javafx.collections.ListChangeListener;
import javafx.css.StyleOrigin;
import javafx.css.StyleableProperty;
import javafx.event.ActionEvent;
import javafx.event.EventType;
import javafx.geometry.Bounds;
import javafx.geometry.Point2D;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.SnapshotParameters;
import javafx.scene.canvas.Canvas;
import javafx.scene.chart.Axis;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.control.ButtonBase;
import javafx.scene.control.Labeled;
import javafx.scene.control.Slider;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputControl;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.image.PixelReader;
import javafx.scene.image.WritableImage;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.input.MouseButton;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.paint.Paint;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.shape.Path;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import javafx.stage.Window;

/**
 * Runs a program on real OpenJFX 21 (headless, with Monocle) the way Java Arena's practice version
 * of JavaFX runs it, and writes its windows as Java Arena's window JSON, so scripts/fx-check can
 * compare the two.
 *
 * <pre>
 * java [Monocle flags] -cp program:openjfx-jars:driver arena.fxcheck.RealFxDriver EVENTS OUT Main args...
 * </pre>
 *
 * The program's main runs on the main thread, as with java Main. A watcher thread waits until
 * start has returned (JavaFX's launcher thread then waits for the session to end), then applies
 * the events of EVENTS on the JavaFX Application Thread with the real API, each after the tasks
 * queued before it (Platform.runLater) have run, as Java Arena applies them: click calls fire(),
 * type calls appendText once per character, set calls setText (Slider.adjustValue for set Slider N
 * value, what letting the thumb go there does), enter fires an ActionEvent at the text field (what
 * pressing Enter does), close closes the primary stage, press, drag, release and click at a
 * point hand real MouseEvents to the scene as the toolkit does (see mouse), press key, release key
 * and key hand it real KeyEvents (see key), and frames runs the started AnimationTimers frame by
 * frame, with the toolkit's own timer paused (see runFrame); before the first event
 * and after each one it lays the showing windows out, as JavaFX's next pulse would, and writes the window
 * after each event line as OUT.step-N (see writeStep). Then it writes OUT and
 * calls Platform.exit(), so stop() runs and launch returns. When the session ends earlier
 * (Platform.exit(), or the last window closed), OUT says the windows were closed; when the
 * constructor, init or start fails, there is no OUT, as with Java Arena's JavaFX.
 *
 * <p>EVENTS is written by scripts/fx-check/fx-check.mjs, which reads the event lines with
 * src/grader/window.ts (the same reading as the library's): one event per line, fields separated
 * by spaces, each field its UTF-16 code units as four hexadecimal digits ("=" for an empty text,
 * "-" for none): {@code P line problem} for a line that can't be read, or {@code E line command
 * kind type value text number x y key} where kind is none, number, id, text or index, number is the
 * number of set Slider 1 25 or of frames 30, x and y the point of a mouse event, and key the
 * KeyCode name of press key, release key and key, each as written.
 *
 * <p>The window JSON follows engine/libraries/javafx/src/arena/fx/WindowJson.java, from the real
 * scene graph, but without the sizes of windows and scenes (the outline leaves them out, and real
 * JavaFX lays windows out). Values that JavaFX's own style sheet (modena.css) gave a node, such as
 * a button's padding, count as not set: the program didn't choose them, and Java Arena's JavaFX
 * has no style sheet. Values that the program's own styles (setStyle) gave a node count as set,
 * since that is what the window shows.
 *
 * <p>Part 14's nodes are read from the real ones: a chart's title, legend, symbols, axes (with their
 * bounds and categories as real JavaFX has them) and every series and data point; a slider's
 * range, value and tick settings; an image view's image through the real PixelReader (its size,
 * the CRC-32 of its ARGB values and its pixels, as arena.fx.Pixels writes them). Real JavaFX
 * doesn't tell what was drawn on a canvas, so a canvas has no calls here ("calls":[]) but a
 * snapshot of what it shows ("snapshot", with "snapshotWidth" and "snapshotHeight"), which
 * fx-check compares with Java Arena's recorded calls drawn again on real JavaFX (CanvasReplay).
 * Part 14.3's shapes are read from the real ones too (geometry, fill, stroke, a Text's text and
 * font, a Path's box), with every node's translate and rotate, its layout where no layout pane
 * moves it (see transforms), the key handlers, and the count of frames run.
 */
public final class RealFxDriver {
    private static final Object LOCK = new Object();
    private static final List<Event> EVENTS = new ArrayList<Event>();
    private static File out;

    /** The stages shown in this session, in the order each was first shown (kept on the FX thread). */
    private static final List<Stage> FIRST_SHOWN = new ArrayList<Stage>();
    /** The stages shown in this session, the one shown last at the end (kept on the FX thread): key events go to the last that still shows. */
    private static final List<Stage> SHOWN_LAST = new ArrayList<Stage>();
    private static volatile boolean everShown;
    /** Whether the window JSON was written (under LOCK). */
    private static boolean dumped;
    /** The next event to apply (FX thread only). */
    private static int next;
    /** The problems of the events applied so far (FX thread; read under LOCK when writing). */
    private static final List<String> PROBLEMS = new ArrayList<String>();

    private RealFxDriver() {
    }

    public static void main(String[] args) throws Throwable {
        readEvents(new String(Files.readAllBytes(new File(args[0]).toPath()), StandardCharsets.UTF_8));
        out = new File(args[1]);
        String mainName = args[2];
        String[] programArgs = Arrays.copyOfRange(args, 3, args.length);
        // Before the program runs, so that every window shown is seen in order.
        Window.getWindows().addListener((ListChangeListener<Window>) change -> {
            while (change.next()) {
                for (Window w : change.getAddedSubList()) {
                    if (w instanceof Stage) {
                        everShown = true;
                        if (!FIRST_SHOWN.contains(w)) {
                            FIRST_SHOWN.add((Stage) w);
                        }
                        SHOWN_LAST.remove(w);
                        SHOWN_LAST.add((Stage) w);
                    }
                }
                // On the JavaFX Application Thread, before start returns: no pulse has run a timer yet.
                pauseTimers();
            }
        });
        Runtime.getRuntime().addShutdownHook(new Thread(RealFxDriver::atExit, "fx-check at exit"));
        Thread watcher = new Thread(RealFxDriver::watch, "fx-check watcher");
        watcher.setDaemon(true);
        watcher.start();
        Class<?> mainClass = Class.forName(mainName, true, ClassLoader.getSystemClassLoader());
        MethodHandle main = MethodHandles.publicLookup().findStatic(mainClass, "main", MethodType.methodType(void.class, String[].class));
        main.invokeExact(programArgs);
    }

    // ------------------------------------------------------------------ the events file

    private static final class Event {
        String line;
        String problem;
        String command;
        String kind;
        String type;
        String value;
        String text;
        /** The number of set Slider 1 25, as written; null otherwise. */
        String number;
        /** The point of a mouse event (press, drag, release, click ... at), as written; null otherwise. */
        String x;
        String y;
        /** The key of press key, release key and key, as written (a KeyCode name); null otherwise. */
        String key;
    }

    private static void readEvents(String file) {
        for (String row : file.split("\n")) {
            if (row.isEmpty()) {
                continue;
            }
            String[] f = row.split(" ", -1);
            Event e = new Event();
            e.line = field(f[1]);
            if (f[0].equals("P")) {
                e.problem = field(f[2]);
            } else {
                e.command = field(f[2]);
                e.kind = field(f[3]);
                e.type = field(f[4]);
                e.value = field(f[5]);
                e.text = field(f[6]);
                e.number = field(f[7]);
                e.x = field(f[8]);
                e.y = field(f[9]);
                e.key = field(f[10]);
            }
            EVENTS.add(e);
        }
    }

    private static String field(String f) {
        if (f.equals("-")) {
            return null;
        }
        if (f.equals("=")) {
            return "";
        }
        char[] chars = new char[f.length() / 4];
        for (int i = 0; i < chars.length; i++) {
            chars[i] = (char) Integer.parseInt(f.substring(4 * i, 4 * i + 4), 16);
        }
        return new String(chars);
    }

    // ------------------------------------------------------------------ the session

    /**
     * Waits until start has returned: JavaFX's launcher thread then waits (CountDownLatch.await,
     * called by LauncherImpl.launchApplication1) for the session to end. Then the events start.
     */
    private static void watch() {
        Thread launcher = null;
        while (true) {
            if (launcher != null && !timersPaused) {
                try {
                    if (((AtomicBoolean) staticField("com.sun.javafx.application.PlatformImpl", "initialized")).get()) {
                        pauseTimers();
                    }
                } catch (ReflectiveOperationException e) {
                    throw new IllegalStateException(e);
                }
            }
            if (launcher == null) {
                launcher = thread("JavaFX-Launcher");
            }
            if (launcher != null) {
                if (!launcher.isAlive()) {
                    return;
                }
                StackTraceElement[] frames = launcher.getStackTrace();
                for (int i = 1; i < frames.length; i++) {
                    if (frames[i].getClassName().equals("com.sun.javafx.application.LauncherImpl") && frames[i].getMethodName().equals("launchApplication1")) {
                        if (frames[i - 1].getClassName().equals("java.util.concurrent.CountDownLatch") && frames[i - 1].getMethodName().equals("await")) {
                            later();
                            return;
                        }
                        break;
                    }
                }
            }
            try {
                Thread.sleep(1);
            } catch (InterruptedException e) {
                return;
            }
        }
    }

    /** The live thread with this name, or null. */
    private static Thread thread(String name) {
        ThreadGroup root = Thread.currentThread().getThreadGroup();
        while (root.getParent() != null) {
            root = root.getParent();
        }
        Thread[] all = new Thread[root.activeCount() + 16];
        int n = root.enumerate(all, true);
        for (int i = 0; i < n; i++) {
            if (all[i].getName().equals(name)) {
                return all[i];
            }
        }
        return null;
    }

    private static void later() {
        try {
            Platform.runLater(RealFxDriver::step);
        } catch (IllegalStateException e) {
            // The toolkit has gone: the session is over, and atExit decides.
        }
    }

    /**
     * One step on the JavaFX Application Thread: wait for the queued tasks, end when the session
     * has ended, else apply the next event; after the last one, write the windows and exit.
     */
    private static void step() {
        synchronized (LOCK) {
            if (dumped) {
                return;
            }
        }
        if (exitCalled()) {
            dump(true);
            return;
        }
        // This step is one of the pending runnables; any other runs first, as Java Arena's drain does.
        if (pendingRunnables() > 1) {
            later();
            return;
        }
        if (everShown && showing().isEmpty()) {
            dump(true);
            return;
        }
        // Where JavaFX's next pulse would lay the windows out: after start, and after each event.
        layoutShowing();
        if (clickRelease != null) {
            // The second half of click ... at: the release, after the tasks the press queued.
            Node node = clickRelease;
            clickRelease = null;
            if (showing(node)) {
                release(node, clickX, clickY);
                layoutShowing();
            } else {
                pressed = null;
            }
            later();
            return;
        }
        if (keyRelease != null) {
            // The second half of key X: the release, after the tasks the press queued.
            KeyCode code = keyRelease;
            keyRelease = null;
            HELD.remove(code);
            String hint = keyHint != null ? keyHint : nodeHint(keyScene, KeyEvent.KEY_RELEASED);
            fireKey(keyScene, KeyEvent.KEY_RELEASED, code);
            if (hint != null) {
                PROBLEMS.add(keyLine + ": " + hint);
            }
            keyScene = null;
            keyHint = null;
            layoutShowing();
            later();
            return;
        }
        if (framesLeft > 0) {
            // One frame of a frames line; the tasks it queued run before the next step, then the layout.
            framesLeft--;
            runFrame();
            later();
            return;
        }
        if (next > stepped) {
            // The event line next (from 1) is over, with the tasks it queued and the layout after it:
            // the window now, as Java Arena's JavaFX writes it after each line for fx-check.
            stepped = next;
            writeStep(next);
        }
        if (next < EVENTS.size()) {
            Event e = EVENTS.get(next++);
            String problem = e.problem;
            if (problem == null) {
                try {
                    problem = apply(e);
                } catch (Throwable t) {
                    uncaught(t);
                }
            }
            if (problem != null) {
                PROBLEMS.add(e.line + ": " + problem);
            }
            layoutShowing();
            later();
            return;
        }
        dump(false);
        Platform.exit();
    }

    /**
     * Lays out every showing window right after an event, as JavaFX's next pulse would (a chart
     * takes its categories and reads its data then), so what follows doesn't depend on when the
     * pulse comes. What the layout throws goes to the uncaught exception handler, as in a pulse.
     */
    private static void layoutShowing() {
        for (Window w : new ArrayList<Window>(Window.getWindows())) {
            if (!w.isShowing() || w.getScene() == null || w.getScene().getRoot() == null) {
                continue;
            }
            try {
                w.getScene().getRoot().layout();
            } catch (Throwable t) {
                uncaught(t);
            }
        }
    }

    // ------------------------------------------------------------------ the game loop (as arena.fx.Frames)

    /** Frame k (from 1) gets now = START + k * STEP, as in Java Arena's JavaFX. */
    private static final long START = 1_000_000_000L;
    private static final long STEP = 16_666_667L;
    private static volatile boolean timersPaused;
    /** How many frames have run (FX thread). */
    private static int frameCount;
    /** The frames of the frames line being applied that are still to run (FX thread). */
    private static int framesLeft;

    private static Object primaryTimer() throws ReflectiveOperationException {
        Object toolkit = Class.forName("com.sun.javafx.tk.Toolkit").getMethod("getToolkit").invoke(null);
        return toolkit.getClass().getMethod("getPrimaryTimer").invoke(toolkit);
    }

    /**
     * Pauses the toolkit's primary timer (AbstractPrimaryTimer.pause(), JavaFX's own method): its
     * main loop then skips every pulse's animation step (MainLoop.run returns at once while it is
     * paused), so started AnimationTimers never run with real time. The scene's own pulses (CSS,
     * layout, rendering) go on. Called as soon as the toolkit is up (from the watcher) and again
     * when a window shows (on the JavaFX Application Thread, before start returns).
     */
    private static synchronized void pauseTimers() {
        try {
            Object timer = primaryTimer();
            timer.getClass().getMethod("pause").invoke(timer);
            timersPaused = true;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    /**
     * One frame, as Java Arena's Frames.runOne: every timer started when the frame begins, in start
     * order, gets handle(now). The started timers are the primary timer's own list
     * (AbstractPrimaryTimer.animationTimers, the first animationTimersLength of them, in the order
     * they were started: start() appends, stop() removes), read by reflection and called through
     * their TimerReceiver, as the timer's pulse calls them. What a handle throws goes to the
     * uncaught exception handler, and the timers after it skip this frame: the primary timer's own
     * pulse (AbstractPrimaryTimer.timePulseImpl) loops over its timers with only a try/finally, so
     * an exception leaves the loop, and Java Arena's Frames.runOne does the same. (timePulseImpl
     * itself isn't called, since it would also step the toolkit's own animations, such as a text
     * field's caret, with the made-up time.)
     */
    private static void runFrame() {
        frameCount++;
        long now = START + frameCount * STEP;
        Object[] receivers;
        Method handle;
        try {
            pauseTimers();
            Object timer = primaryTimer();
            Class<?> c = Class.forName("com.sun.scenario.animation.AbstractPrimaryTimer");
            Field list = c.getDeclaredField("animationTimers");
            Field length = c.getDeclaredField("animationTimersLength");
            list.setAccessible(true);
            length.setAccessible(true);
            receivers = Arrays.copyOf((Object[]) list.get(timer), length.getInt(timer));
            handle = Class.forName("com.sun.scenario.animation.shared.TimerReceiver").getMethod("handle", long.class);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        for (Object r : receivers) {
            try {
                handle.invoke(r, now);
            } catch (InvocationTargetException e) {
                uncaught(e.getCause());
                return;
            } catch (IllegalAccessException e) {
                throw new IllegalStateException(e);
            }
        }
    }

    /** What an exception that escapes a handler or a pulse does in JavaFX: the thread's uncaught exception handler gets it. */
    private static void uncaught(Throwable t) {
        Thread.currentThread().getUncaughtExceptionHandler().uncaughtException(Thread.currentThread(), t);
    }

    /**
     * At exit, when the windows weren't written: the session ended before the events were done
     * (Platform.exit(), or the last window closed in start) and the program got that far without a
     * failure, so the windows were closed. A failing constructor, init or start, or a launch that
     * never started the toolkit, leaves no window file, as in Java Arena's JavaFX.
     */
    private static void atExit() {
        synchronized (LOCK) {
            if (dumped) {
                return;
            }
        }
        try {
            if (!((AtomicBoolean) staticField("com.sun.javafx.application.LauncherImpl", "launchCalled")).get()) {
                return;
            }
            for (String failure : new String[] { "launchException", "constructorError", "initError", "startError" }) {
                if (staticField("com.sun.javafx.application.LauncherImpl", failure) != null) {
                    return;
                }
            }
            if (!((AtomicBoolean) staticField("com.sun.javafx.application.PlatformImpl", "initialized")).get()) {
                return;
            }
        } catch (ReflectiveOperationException e) {
            return;
        }
        if (exitCalled() || (everShown && Window.getWindows().isEmpty())) {
            dump(true);
        }
    }

    private static Object staticField(String className, String name) throws ReflectiveOperationException {
        Field f = Class.forName(className).getDeclaredField(name);
        f.setAccessible(true);
        return f.get(null);
    }

    private static boolean exitCalled() {
        try {
            return ((AtomicBoolean) staticField("com.sun.javafx.application.PlatformImpl", "platformExit")).get();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static int pendingRunnables() {
        try {
            return ((AtomicInteger) staticField("com.sun.javafx.application.PlatformImpl", "pendingRunnables")).get();
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Stage primary() {
        for (Stage s : FIRST_SHOWN) {
            try {
                Method m = Stage.class.getDeclaredMethod("isPrimary");
                m.setAccessible(true);
                if ((Boolean) m.invoke(s)) {
                    return s;
                }
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException(e);
            }
        }
        return null;
    }

    /** The showing windows: the primary stage first, then the others in the order they were first shown. */
    private static List<Stage> showing() {
        List<Stage> list = new ArrayList<Stage>();
        Stage primary = primary();
        if (primary != null && primary.isShowing()) {
            list.add(primary);
        }
        for (Stage s : FIRST_SHOWN) {
            if (s != primary && s.isShowing()) {
                list.add(s);
            }
        }
        return list;
    }

    /** The last event line whose window was written by writeStep (FX thread). */
    private static int stepped;
    /** While writeStep writes: canvases are written without their snapshot (FX thread). */
    private static boolean writingStep;

    /**
     * The window after the n-th event line (counted from 1, as Java Arena's JavaFX counts them),
     * written next to OUT as OUT.step-n, as Java Arena's JavaFX writes .arena/window-step-n.json
     * when fx-check asks for it. Written only while the session goes on, as there. A canvas is
     * written without its snapshot: its drawing is compared only after the last line.
     */
    private static void writeStep(int n) {
        String json;
        synchronized (LOCK) {
            List<Stage> windows = showing();
            for (Stage s : windows) {
                if (s.getScene() != null) {
                    s.getScene().getRoot().applyCss();
                }
            }
            writingStep = true;
            try {
                json = new Json().write(windows, false, PROBLEMS);
            } finally {
                writingStep = false;
            }
        }
        try {
            Files.write(new File(out.getPath() + ".step-" + n).toPath(), json.getBytes(StandardCharsets.US_ASCII));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void dump(boolean closed) {
        String json;
        synchronized (LOCK) {
            if (dumped) {
                return;
            }
            dumped = true;
            if (keyRelease != null && keyHint != null) {
                // The session ended between the press and the release of key X: the release never
                // comes, but the press's problem stays, as in Java Arena.
                PROBLEMS.add(keyLine + ": " + keyHint);
                keyHint = null;
            }
            List<Stage> windows = closed ? new ArrayList<Stage>() : showing();
            // Styles apply in the next pulse; apply them now, so the windows don't depend on when that is.
            for (Stage s : windows) {
                if (s.getScene() != null) {
                    s.getScene().getRoot().applyCss();
                }
            }
            json = new Json().write(windows, closed, PROBLEMS);
        }
        try {
            Files.write(out.toPath(), json.getBytes(StandardCharsets.US_ASCII));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    // ------------------------------------------------------------------ events (as arena.fx.Targets)

    private static String apply(Event event) {
        List<Stage> windows = showing();
        if (event.command.equals("close")) {
            Stage primary = primary();
            if (primary == null || !primary.isShowing()) {
                return "the main window isn't open";
            }
            primary.close();
            return null;
        }
        if (windows.isEmpty()) {
            return "no window is open";
        }
        if (event.command.equals("frames")) {
            framesLeft = Integer.parseInt(event.number);
            return null;
        }
        if (event.key != null) {
            return key(event);
        }
        List<Node> nodes = nodes(windows);
        Node node = null;
        if (event.kind.equals("number")) {
            int n = Integer.parseInt(event.value);
            if (n > nodes.size()) {
                return "there's no node #" + n + " (the open " + (windows.size() == 1 ? "window has " : "windows have ") + nodes.size() + ")";
            }
            node = nodes.get(n - 1);
        } else if (event.kind.equals("id")) {
            for (Node x : nodes) {
                if (event.value.equals(x.getId())) {
                    node = x;
                    break;
                }
            }
            if (node == null) {
                return "there's no node with the id \"" + event.value + "\"";
            }
        } else if (event.kind.equals("text")) {
            for (Node x : nodes) {
                if (isA(x, event.type) && hasText(x) && event.value.equals(textOf(x))) {
                    node = x;
                    break;
                }
            }
            if (node == null) {
                return "there's no " + noun(event.type) + " with the text " + quoted(event.value);
            }
        } else {
            int k = Integer.parseInt(event.value);
            int count = 0;
            for (Node x : nodes) {
                if (isA(x, event.type)) {
                    count++;
                    if (count == k) {
                        node = x;
                    }
                }
            }
            if (node == null) {
                return count == 0 ? "there's no " + noun(event.type) : count == 1 ? "there's only 1 " + noun(event.type) : "there are only " + count + " " + plural(event.type);
            }
        }
        String kind = noun(typeName(node));
        String command = event.command;
        if (event.x != null) {
            return mouse(event, node, kind);
        }
        if (command.equals("click")) {
            if (node instanceof Canvas || node instanceof ImageView) {
                return withArticle(kind) + " isn't clicked like a button: give the point, such as click " + typeName(node) + " 1 at 10 20";
            }
            if (!(node instanceof ButtonBase)) {
                return withArticle(kind) + " can't be clicked (only buttons can)";
            }
            String hidden = hidden(node, kind, "clicked");
            if (hidden != null) {
                return hidden;
            }
            ((ButtonBase) node).fire();
            return null;
        }
        if (command.equals("enter")) {
            if (!(node instanceof TextField)) {
                return "Enter can be pressed only in a text field, not in " + withArticle(kind);
            }
            String hidden = hidden(node, kind, "used");
            if (hidden != null) {
                return hidden;
            }
            if (!node.isDisabled()) {
                // What pressing Enter in a text field does: an ActionEvent at the field.
                node.fireEvent(new ActionEvent());
            }
            return null;
        }
        // type and set
        if (node instanceof Slider) {
            if (event.number == null) {
                return command.equals("set") ? "a slider is set to a number, not a text, such as set Slider 1 25" : "you can't type in a slider (set Slider 1 25 moves it)";
            }
            return slide((Slider) node, event.number);
        }
        if (event.number != null) {
            return node instanceof TextInputControl ? "the text for " + withArticle(kind) + " goes in double quotes, such as set " + typeName(node) + " 1 \"" + event.number + "\"" : "only a slider is set to a number, not " + withArticle(kind);
        }
        if (!(node instanceof TextInputControl)) {
            return "you can't type in " + withArticle(kind) + " (only in text fields and text areas)";
        }
        TextInputControl field = (TextInputControl) node;
        String hidden = hidden(node, kind, "typed in");
        if (hidden != null) {
            return hidden;
        }
        if (field.isDisabled()) {
            return (field.isDisable() ? "the " + kind + " is disabled" : "the " + kind + " is in a disabled pane") + " (setDisable(true)), so you can't type in it";
        }
        if (!field.isEditable()) {
            return "the " + kind + " isn't editable (setEditable(false)), so you can't type in it";
        }
        if (command.equals("set")) {
            field.setText(event.text);
        } else {
            String text = event.text;
            for (int i = 0; i < text.length(); ) {
                int end = i + Character.charCount(text.codePointAt(i));
                field.appendText(text.substring(i, end));
                i = end;
            }
        }
        return null;
    }

    /**
     * set Slider N value: the checks of Java Arena's event lines, then what letting the slider's
     * thumb go at that value does in JavaFX: Slider.adjustValue (kept between min and max, snapped
     * to the ticks when the slider snaps, then set once).
     */
    private static String slide(Slider slider, String number) {
        String hidden = hidden(slider, "slider", "moved");
        if (hidden != null) {
            return hidden;
        }
        if (slider.isDisabled()) {
            return (slider.isDisable() ? "the slider is disabled" : "the slider is in a disabled pane") + " (setDisable(true)), so it can't be moved";
        }
        double v = Double.parseDouble(number);
        if (v < slider.getMin() || v > slider.getMax()) {
            return "the slider goes from " + plain(slider.getMin()) + " to " + plain(slider.getMax()) + ", so it can't be moved to " + number;
        }
        slider.adjustValue(v);
        return null;
    }

    private static String plain(double v) {
        String s = Double.toString(v);
        return s.endsWith(".0") ? s.substring(0, s.length() - 2) : s;
    }

    // ------------------------------------------------------------------ the keyboard (as arena.fx.Keys)

    /** The keys held down (pressed and not yet released), FX thread. */
    private static final java.util.Set<KeyCode> HELD = new java.util.HashSet<KeyCode>();
    /** The key of a key X line whose release comes in the next step, after the tasks its press queued; and the scene it goes to. */
    private static KeyCode keyRelease;
    private static Scene keyScene;

    /**
     * The text a key makes, as Java Arena's JavaFX gives it (arena.fx.Keys): what OpenJFX 21's
     * headless platform (Monocle, a US keyboard, Shift up) gives the key, checked with its Robot
     * when the library was written. A desktop can differ for Enter and the punctuation keys (see
     * engine/libraries/README.md); letters, digits, Space and the arrows are the same everywhere.
     */
    private static final String[] TEXTS = {
        "ENTER", "\n", "TAB", "\t", "SPACE", " ", "COMMA", ",", "MINUS", "-", "PERIOD", ".", "SLASH", "/", "SEMICOLON", ";", "EQUALS", "=",
        "BACK_SLASH", "\\", "MULTIPLY", "*", "DIVIDE", "/", "BACK_QUOTE", "`", "QUOTE", "'", "BRACELEFT", "[", "BRACERIGHT", "]",
    };

    private static String keyText(KeyCode code) {
        String name = code.name();
        if (code.isLetterKey()) {
            return name.toLowerCase(java.util.Locale.ROOT);
        }
        if (name.startsWith("DIGIT") && name.length() == 6) {
            return name.substring(5);
        }
        for (int i = 0; i < TEXTS.length; i += 2) {
            if (TEXTS[i].equals(name)) {
                return TEXTS[i + 1];
            }
        }
        return "";
    }

    /**
     * The window key events go to: the one shown last that still shows, the library's rule (Monocle's
     * headless platform says every showing window is focused, so real JavaFX can't choose here).
     */
    private static Stage focused() {
        for (int i = SHOWN_LAST.size() - 1; i >= 0; i--) {
            if (SHOWN_LAST.get(i).isShowing()) {
                return SHOWN_LAST.get(i);
            }
        }
        return null;
    }

    /**
     * press key, release key and key, with the checks of Java Arena's event lines (the same
     * problems in the same words), then real KeyEvents made with JavaFX's own constructor, handed
     * to the scene as the toolkit hands it a key event (Scene.processKeyEvent), so real JavaFX
     * sends each to the focus owner when there is one, else to the scene: KEY_PRESSED, then
     * KEY_TYPED for a key that makes a character; for key X the KEY_RELEASED comes in the next
     * step, after the tasks the press queued.
     */
    private static String key(Event event) {
        KeyCode code = KeyCode.valueOf(event.key);
        Stage window = focused();
        if (window == null) {
            return "no window is open";
        }
        Scene scene = window.getScene();
        if (scene == null) {
            return "the window has no scene, so no key goes to it";
        }
        boolean held = HELD.contains(code);
        String name = code.name();
        if (event.command.equals("release key")) {
            if (!held) {
                return name + " isn't held down: press key " + name + " comes first";
            }
            HELD.remove(code);
            String hint = nodeHint(scene, KeyEvent.KEY_RELEASED);
            fireKey(scene, KeyEvent.KEY_RELEASED, code);
            return hint;
        }
        if (held) {
            return name + " is already held down (press key " + name + " came before): release key " + name + " first";
        }
        HELD.add(code);
        String hint = nodeHint(scene, KeyEvent.KEY_PRESSED);
        fireKey(scene, KeyEvent.KEY_PRESSED, code);
        if (!keyText(code).isEmpty()) {
            hint = hint != null ? hint : nodeHint(scene, KeyEvent.KEY_TYPED);
            fireKey(scene, KeyEvent.KEY_TYPED, code);
        }
        if (event.command.equals("key")) {
            keyRelease = code;
            keyScene = scene;
            keyLine = event.line;
            keyHint = hint;
            return null;
        }
        return hint;
    }

    /** The line of a key X whose release is still to come, and its problem so far (the release can add one). */
    private static String keyLine;
    private static String keyHint;
    private static final java.util.Set<EventType<KeyEvent>> HINTED = new java.util.HashSet<EventType<KeyEvent>>();

    /**
     * The problem Java Arena's JavaFX gives (arena.fx.Keys) when the node that has the focus (on
     * real JavaFX, the scene's focus owner; in Java Arena, the node requestFocus() was called on
     * last), or a pane around it, has its own handler for this type: real JavaFX runs it first, and
     * Java Arena only the scene's. Once per type of key event in a session.
     */
    private static String nodeHint(Scene scene, EventType<KeyEvent> type) {
        Node focus = scene.getFocusOwner();
        if (focus == null || HINTED.contains(type)) {
            return null;
        }
        String setter = type == KeyEvent.KEY_PRESSED ? "setOnKeyPressed" : type == KeyEvent.KEY_RELEASED ? "setOnKeyReleased" : "setOnKeyTyped";
        for (Node n = focus; n != null; n = n.getParent()) {
            Object handler = type == KeyEvent.KEY_PRESSED ? n.getOnKeyPressed() : type == KeyEvent.KEY_RELEASED ? n.getOnKeyReleased() : n.getOnKeyTyped();
            if (handler != null) {
                HINTED.add(type);
                String where = n == focus ? "a node with its own " + setter : "a node inside a pane with its own " + setter;
                return "the program called requestFocus() on " + where + ", which real JavaFX would run first; in Java Arena keys go only to the scene's handlers (put it on the scene: scene." + setter + ")";
            }
        }
        return null;
    }

    private static Method processKeyEvent;

    private static void fireKey(Scene scene, EventType<KeyEvent> type, KeyCode code) {
        String text = keyText(code);
        KeyEvent e = type == KeyEvent.KEY_TYPED ? new KeyEvent(type, text, "", KeyCode.UNDEFINED, false, false, false, false)
                : new KeyEvent(type, KeyEvent.CHAR_UNDEFINED, text, code, false, false, false, false);
        try {
            if (processKeyEvent == null) {
                processKeyEvent = Scene.class.getDeclaredMethod("processKeyEvent", KeyEvent.class);
                processKeyEvent.setAccessible(true);
            }
            processKeyEvent.invoke(scene, e);
        } catch (InvocationTargetException ex) {
            uncaught(ex.getCause());
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }

    // ------------------------------------------------------------------ the mouse

    /** The node the mouse was pressed on (until it is released), and where the mouse is, in its coordinates. */
    private static Node pressed;
    private static double atX;
    private static double atY;
    /** The node of a click ... at whose release comes in the next step, after the tasks its press queued; and the point. */
    private static Node clickRelease;
    private static double clickX;
    private static double clickY;

    /**
     * press, drag, release and click at a point, with the checks of Java Arena's event lines (the
     * same problems in the same words), then as a mouse does it: each is a real MouseEvent made with
     * JavaFX's own constructor at the point in the scene's coordinates, handed to the scene as the
     * toolkit hands it a mouse event (Scene.processMouseEvent), so real JavaFX picks the node under
     * the point, sends the drags and the release to the node it was pressed on, and decides itself
     * whether a MOUSE_CLICKED follows a release. As a mouse, the driver sends no drag when the point
     * didn't change, and moves the mouse (a drag) before a release somewhere else. A click is a
     * press, then (in the next step, after the tasks the press queued) a release at the same point.
     */
    private static String mouse(Event event, Node node, String kind) {
        if (!(node instanceof Canvas || node instanceof ImageView)) {
            return "the mouse events with a point go to a canvas or an image view, not to " + withArticle(kind) + " (Java Arena doesn't lay the other nodes out, so it can't tell where a point is on them)";
        }
        double x = Double.parseDouble(event.x);
        double y = Double.parseDouble(event.y);
        String where = "(" + event.x + ", " + event.y + ")";
        if (event.command.equals("press") || event.command.equals("click")) {
            String verb = event.command.equals("click") ? "clicked" : "pressed";
            String hidden = hidden(node, kind, verb);
            if (hidden != null) {
                return hidden;
            }
            if (node.isDisabled()) {
                return (node.isDisable() ? "the " + kind + " is disabled" : "the " + kind + " is in a disabled pane") + " (setDisable(true)), so it can't be " + verb;
            }
            if (pressed != null) {
                return "the mouse is already pressed: release it first, such as release " + typeName(pressed) + " 1 at " + plain(atX) + " " + plain(atY);
            }
            if (node instanceof Canvas) {
                Canvas c = (Canvas) node;
                if (!node.contains(x, y)) {
                    return where + " isn't on the canvas, which is " + plain(c.getWidth()) + " x " + plain(c.getHeight());
                }
            } else {
                Image image = ((ImageView) node).getImage();
                if (image == null) {
                    return where + " isn't on the image view: it has no image";
                }
                if (image.isError()) {
                    return where + " isn't on the image view: its image couldn't be read";
                }
                if (x < 0 || y < 0 || x >= image.getWidth() || y >= image.getHeight()) {
                    return where + " isn't on the image view, whose image is " + plain(image.getWidth()) + " x " + plain(image.getHeight());
                }
                if (!node.contains(x, y)) {
                    return "the image view's image is transparent at " + where + ", so the mouse goes through it";
                }
            }
            pressed = node;
            atX = x;
            atY = y;
            send(node, MouseEvent.MOUSE_PRESSED, x, y, true);
            if (event.command.equals("click")) {
                clickRelease = node;
                clickX = x;
                clickY = y;
            }
            return null;
        }
        if (pressed == null) {
            return "the mouse isn't pressed: press it first, such as press " + typeName(node) + " 1 at 10 20";
        }
        if (pressed != node) {
            return "the mouse is pressed on another node: " + event.command + " it on the " + noun(typeName(pressed)) + " it was pressed on";
        }
        if (event.command.equals("drag")) {
            drag(node, x, y);
        } else {
            release(node, x, y);
        }
        return null;
    }

    private static void drag(Node node, double x, double y) {
        if (x == atX && y == atY) {
            return;
        }
        atX = x;
        atY = y;
        send(node, MouseEvent.MOUSE_DRAGGED, x, y, true);
    }

    private static void release(Node node, double x, double y) {
        drag(node, x, y);
        pressed = null;
        send(node, MouseEvent.MOUSE_RELEASED, x, y, false);
    }

    private static boolean showing(Node node) {
        Scene scene = node.getScene();
        return scene != null && scene.getWindow() != null && scene.getWindow().isShowing();
    }

    private static Method processMouseEvent;

    /**
     * A mouse event at the point (in the node's coordinates) as the toolkit delivers one: in the
     * scene's coordinates, to Scene.processMouseEvent. What a handler throws goes to the uncaught
     * exception handler, as it does from a real mouse event.
     */
    private static void send(Node node, EventType<MouseEvent> type, double x, double y, boolean buttonDown) {
        Scene scene = node.getScene();
        Point2D p = node.localToScene(x, y);
        Window w = scene.getWindow();
        double screenX = p.getX() + scene.getX() + w.getX();
        double screenY = p.getY() + scene.getY() + w.getY();
        MouseEvent e = new MouseEvent(type, p.getX(), p.getY(), screenX, screenY, MouseButton.PRIMARY, 1, false, false, false, false, buttonDown, false, false, false, false, false, null);
        try {
            if (processMouseEvent == null) {
                processMouseEvent = Scene.class.getDeclaredMethod("processMouseEvent", MouseEvent.class);
                processMouseEvent.setAccessible(true);
            }
            processMouseEvent.invoke(scene, e);
        } catch (InvocationTargetException ex) {
            uncaught(ex.getCause());
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static String hidden(Node node, String kind, String verb) {
        for (Node n = node; n != null; n = n.getParent()) {
            if (!n.isVisible()) {
                return (n == node ? "the " + kind + " is hidden" : "the " + kind + " is in a hidden pane") + " (setVisible(false)), so it can't be " + verb;
            }
        }
        return null;
    }

    private static String quoted(String text) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"' || c == '\\') {
                sb.append('\\').append(c);
            } else if (c == '\n') {
                sb.append("\\n");
            } else if (c == '\t') {
                sb.append("\\t");
            } else {
                sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    // ------------------------------------------------------------------ outline order and names (as arena.fx.Outline)

    /** The node classes of Java Arena's JavaFX, by simple name. */
    private static final List<String> TYPES = Arrays.asList("Node", "Parent", "Region", "Pane", "FlowPane", "HBox", "VBox", "StackPane", "BorderPane", "GridPane", "Control", "Labeled", "Label", "ButtonBase", "Button", "TextInputControl", "TextField", "PasswordField", "TextArea", "Canvas", "ImageView", "Slider", "LineChart", "BarChart", "ScatterChart", "Shape", "Polygon", "Circle", "Rectangle", "Line", "Text", "Path");
    /** The axis classes of Java Arena's JavaFX, by simple name. */
    private static final List<String> AXES = Arrays.asList("Axis", "ValueAxis", "NumberAxis", "CategoryAxis");

    /** The nearest class that Java Arena's JavaFX has (a program's class MenuView extends VBox is a VBox). */
    private static String typeName(Node node) {
        List<String> known = node instanceof Axis ? AXES : TYPES;
        for (Class<?> c = node.getClass(); c != null; c = c.getSuperclass()) {
            String name = c.getName();
            if (name.startsWith("javafx.") && known.contains(name.substring(name.lastIndexOf('.') + 1))) {
                return name.substring(name.lastIndexOf('.') + 1);
            }
        }
        return node.getClass().getName();
    }

    private static boolean isA(Node node, String type) {
        for (Class<?> c = node.getClass(); c != null; c = c.getSuperclass()) {
            String name = c.getName();
            if (name.startsWith("javafx.") && name.substring(name.lastIndexOf('.') + 1).equals(type)) {
                return true;
            }
        }
        return false;
    }

    private static String noun(String type) {
        switch (type) {
            case "Button":
            case "ButtonBase":
                return "button";
            case "Label":
                return "label";
            case "Labeled":
                return "label or button";
            case "TextField":
                return "text field";
            case "PasswordField":
                return "password field";
            case "TextArea":
                return "text area";
            case "TextInputControl":
                return "text field or text area";
            case "Control":
                return "control";
            case "Node":
                return "node";
            case "Canvas":
                return "canvas";
            case "ImageView":
                return "image view";
            case "Slider":
                return "slider";
            case "LineChart":
                return "line chart";
            case "BarChart":
                return "bar chart";
            case "ScatterChart":
                return "scatter chart";
            case "Shape":
            case "Polygon":
            case "Circle":
            case "Rectangle":
            case "Line":
            case "Text":
            case "Path":
                return type.toLowerCase(java.util.Locale.ROOT);
            default:
                return type;
        }
    }

    private static String plural(String type) {
        switch (type) {
            case "Labeled":
                return "labels or buttons";
            case "TextInputControl":
                return "text fields or text areas";
            case "HBox":
            case "VBox":
                return type + "es";
            case "Canvas":
                return "canvases";
            default:
                return noun(type) + "s";
        }
    }

    private static String withArticle(String noun) {
        char c = noun.charAt(0);
        boolean an = "aeiouAEIOU".indexOf(c) >= 0 || noun.startsWith("HBox");
        return (an ? "an " : "a ") + noun;
    }

    private static boolean hasText(Node node) {
        return node instanceof Labeled || node instanceof TextInputControl;
    }

    private static String textOf(Node node) {
        if (node instanceof Labeled) {
            return ((Labeled) node).getText();
        }
        if (node instanceof TextInputControl) {
            return ((TextInputControl) node).getText();
        }
        return null;
    }

    private static int orZero(Integer value) {
        return value == null ? 0 : value;
    }

    /** A node's children in outline order: a pane's in order, a BorderPane's regions, a GridPane's by row, then column. */
    private static List<Node> children(Node node) {
        List<Node> list = new ArrayList<Node>();
        if (node instanceof BorderPane) {
            BorderPane b = (BorderPane) node;
            for (Node r : new Node[] { b.getTop(), b.getLeft(), b.getCenter(), b.getRight(), b.getBottom() }) {
                if (r != null) {
                    list.add(r);
                }
            }
        } else if (node instanceof GridPane) {
            list.addAll(((GridPane) node).getChildren());
            Collections.sort(list, new Comparator<Node>() {
                @Override
                public int compare(Node a, Node b) {
                    int byRow = Integer.compare(orZero(GridPane.getRowIndex(a)), orZero(GridPane.getRowIndex(b)));
                    return byRow != 0 ? byRow : Integer.compare(orZero(GridPane.getColumnIndex(a)), orZero(GridPane.getColumnIndex(b)));
                }
            });
        } else if (node instanceof Pane) {
            list.addAll(((Pane) node).getChildren());
        }
        return list;
    }

    private static List<Node> nodes(List<Stage> windows) {
        List<Node> all = new ArrayList<Node>();
        for (Stage w : windows) {
            if (w.getScene() != null) {
                collect(w.getScene().getRoot(), all);
            }
        }
        return all;
    }

    private static void collect(Node node, List<Node> all) {
        all.add(node);
        for (Node child : children(node)) {
            collect(child, all);
        }
    }

    // ------------------------------------------------------------------ pixels (as arena.fx.Pixels)

    /** The CRC-32 of the ARGB values, row by row, each as 4 bytes (A, R, G, B), as 8 hexadecimal digits. */
    private static String crc(int[] argb) {
        CRC32 crc = new CRC32();
        crc.update(argbBytes(argb, false));
        String hex = Long.toHexString(crc.getValue());
        return "00000000".substring(hex.length()) + hex;
    }

    /** The pixels as base64 of RGBA bytes (not premultiplied), row by row. */
    private static String rgbaBase64(int[] argb) {
        return Base64.getEncoder().encodeToString(argbBytes(argb, true));
    }

    private static byte[] argbBytes(int[] argb, boolean rgba) {
        byte[] bytes = new byte[argb.length * 4];
        for (int i = 0; i < argb.length; i++) {
            int v = rgba ? (argb[i] << 8) | (argb[i] >>> 24) : argb[i];
            bytes[4 * i] = (byte) (v >>> 24);
            bytes[4 * i + 1] = (byte) (v >>> 16);
            bytes[4 * i + 2] = (byte) (v >>> 8);
            bytes[4 * i + 3] = (byte) v;
        }
        return bytes;
    }

    // ------------------------------------------------------------------ the window JSON (as arena.fx.WindowJson)

    /** A value a style sheet of JavaFX's own (modena.css) gave counts as the default: the program didn't set it. */
    private static <T> T set(Object property, T value, T usual) {
        if (property instanceof StyleableProperty && ((StyleableProperty<?>) property).getStyleOrigin() == StyleOrigin.USER_AGENT) {
            return usual;
        }
        return value;
    }

    private static final class Json {
        private final StringBuilder sb = new StringBuilder();
        private int count;

        String write(List<Stage> windows, boolean closed, List<String> problems) {
            sb.append("{\"windows\":[");
            for (int i = 0; i < windows.size(); i++) {
                if (i > 0) {
                    sb.append(',');
                }
                Stage w = windows.get(i);
                sb.append("{\"title\":");
                string(w.getTitle());
                key("scene");
                Scene scene = w.getScene();
                if (scene == null) {
                    sb.append("null");
                } else {
                    sb.append('{');
                    if (scene.getOnKeyPressed() != null) {
                        sb.append("\"onKeyPressed\":true,");
                    }
                    if (scene.getOnKeyReleased() != null) {
                        sb.append("\"onKeyReleased\":true,");
                    }
                    if (scene.getOnKeyTyped() != null) {
                        sb.append("\"onKeyTyped\":true,");
                    }
                    sb.append("\"root\":");
                    node(scene.getRoot(), false, null);
                    sb.append('}');
                }
                sb.append('}');
            }
            sb.append(']');
            if (closed) {
                sb.append(",\"closed\":true");
            }
            sb.append(",\"problems\":[");
            for (int i = 0; i < problems.size(); i++) {
                if (i > 0) {
                    sb.append(',');
                }
                string(problems.get(i));
            }
            sb.append(']');
            if (frameCount > 0) {
                // The outline needs only the count; the frames themselves are the page's animation.
                sb.append(",\"frames\":{\"count\":").append(frameCount).append(",\"list\":[]}");
            }
            sb.append('}');
            return sb.toString();
        }

        private void node(Node node, boolean inGrid, Node parent) {
            sb.append("{\"n\":").append(++count);
            key("type");
            string(typeName(node));
            if (inGrid) {
                key("column").append(orZero(GridPane.getColumnIndex(node)));
                key("row").append(orZero(GridPane.getRowIndex(node)));
                Integer cs = GridPane.getColumnSpan(node);
                Integer rs = GridPane.getRowSpan(node);
                if (cs != null && cs > 1) {
                    key("columnSpan").append(cs);
                }
                if (rs != null && rs > 1) {
                    key("rowSpan").append(rs);
                }
            }
            String id = node.getId();
            if (id != null && !id.isEmpty()) {
                key("id");
                string(id);
            }
            if (hasText(node)) {
                key("text");
                string(textOf(node));
            } else if (node instanceof Text) {
                key("text");
                string(((Text) node).getText());
            }
            if (node instanceof TextInputControl) {
                String prompt = ((TextInputControl) node).getPromptText();
                if (prompt != null && !prompt.isEmpty()) {
                    key("promptText");
                    string(prompt);
                }
            }
            if (node.isDisable()) {
                key("disable").append("true");
            }
            if (!set(node.visibleProperty(), node.isVisible(), true)) {
                key("visible").append("false");
            }
            if (node instanceof TextInputControl && !((TextInputControl) node).isEditable()) {
                key("editable").append("false");
            }
            boolean wraps = node instanceof Labeled ? set(((Labeled) node).wrapTextProperty(), ((Labeled) node).isWrapText(), false)
                    : node instanceof TextArea ? set(((TextArea) node).wrapTextProperty(), ((TextArea) node).isWrapText(), false) : false;
            if (wraps) {
                key("wrapText").append("true");
            }
            Font font = node instanceof Labeled ? set(((Labeled) node).fontProperty(), ((Labeled) node).getFont(), Font.getDefault())
                    : node instanceof TextInputControl ? set(((TextInputControl) node).fontProperty(), ((TextInputControl) node).getFont(), Font.getDefault())
                    : node instanceof Text ? set(((Text) node).fontProperty(), ((Text) node).getFont(), Font.getDefault()) : Font.getDefault();
            if (font == null) {
                key("font").append("null");
            } else if (!font.equals(Font.getDefault())) {
                key("font").append("{\"family\":");
                string(font.getFamily());
                key("size");
                number(font.getSize());
                sb.append('}');
            }
            String style = node.getStyle();
            if (style != null && !style.isEmpty()) {
                key("style");
                string(style);
            }
            transforms(node, parent);
            if (node instanceof Region) {
                Region r = (Region) node;
                double pw = set(r.prefWidthProperty(), r.getPrefWidth(), Region.USE_COMPUTED_SIZE);
                double ph = set(r.prefHeightProperty(), r.getPrefHeight(), Region.USE_COMPUTED_SIZE);
                if (pw != Region.USE_COMPUTED_SIZE) {
                    key("prefWidth");
                    number(pw);
                }
                if (ph != Region.USE_COMPUTED_SIZE) {
                    key("prefHeight");
                    number(ph);
                }
                Insets p = set(r.paddingProperty(), r.getPadding(), Insets.EMPTY);
                if (p.getTop() != 0 || p.getRight() != 0 || p.getBottom() != 0 || p.getLeft() != 0) {
                    key("padding").append('[');
                    number(p.getTop());
                    sb.append(',');
                    number(p.getRight());
                    sb.append(',');
                    number(p.getBottom());
                    sb.append(',');
                    number(p.getLeft());
                    sb.append(']');
                }
            }
            double spacing = node instanceof HBox ? set(((HBox) node).spacingProperty(), ((HBox) node).getSpacing(), 0.0)
                    : node instanceof VBox ? set(((VBox) node).spacingProperty(), ((VBox) node).getSpacing(), 0.0) : 0;
            if (spacing != 0) {
                key("spacing");
                number(spacing);
            }
            double hgap = node instanceof FlowPane ? set(((FlowPane) node).hgapProperty(), ((FlowPane) node).getHgap(), 0.0)
                    : node instanceof GridPane ? set(((GridPane) node).hgapProperty(), ((GridPane) node).getHgap(), 0.0) : 0;
            double vgap = node instanceof FlowPane ? set(((FlowPane) node).vgapProperty(), ((FlowPane) node).getVgap(), 0.0)
                    : node instanceof GridPane ? set(((GridPane) node).vgapProperty(), ((GridPane) node).getVgap(), 0.0) : 0;
            if (hgap != 0) {
                key("hgap");
                number(hgap);
            }
            if (vgap != 0) {
                key("vgap");
                number(vgap);
            }
            if (node instanceof HBox || node instanceof VBox || node instanceof FlowPane || node instanceof GridPane || node instanceof StackPane) {
                Pos usual = node instanceof StackPane ? Pos.CENTER : Pos.TOP_LEFT;
                Pos alignment = node instanceof HBox ? set(((HBox) node).alignmentProperty(), ((HBox) node).getAlignment(), usual)
                        : node instanceof VBox ? set(((VBox) node).alignmentProperty(), ((VBox) node).getAlignment(), usual)
                        : node instanceof FlowPane ? set(((FlowPane) node).alignmentProperty(), ((FlowPane) node).getAlignment(), usual)
                        : node instanceof GridPane ? set(((GridPane) node).alignmentProperty(), ((GridPane) node).getAlignment(), usual)
                        : set(((StackPane) node).alignmentProperty(), ((StackPane) node).getAlignment(), usual);
                if (alignment != usual) {
                    key("alignment");
                    string(alignment == null ? null : alignment.name());
                }
            }
            if ((node instanceof ButtonBase && ((ButtonBase) node).getOnAction() != null) || (node instanceof TextField && ((TextField) node).getOnAction() != null)) {
                key("onAction").append("true");
            }
            keyHandlers(node);
            if (node instanceof Canvas) {
                canvas((Canvas) node);
            } else if (node instanceof Shape) {
                mouseHandlers(node);
                shape((Shape) node);
            } else if (node instanceof ImageView) {
                mouseHandlers(node);
                imageView((ImageView) node);
            } else {
                mouseHandlers(node);
                if (node instanceof Slider) {
                    slider((Slider) node);
                } else if (node instanceof XYChart) {
                    chart((XYChart<?, ?>) node);
                }
            }
            if (node instanceof BorderPane) {
                BorderPane b = (BorderPane) node;
                region("top", b.getTop());
                region("left", b.getLeft());
                region("center", b.getCenter());
                region("right", b.getRight());
                region("bottom", b.getBottom());
            } else if (node instanceof Pane) {
                key("children").append('[');
                List<Node> children = children(node);
                for (int i = 0; i < children.size(); i++) {
                    if (i > 0) {
                        sb.append(',');
                    }
                    node(children.get(i), node instanceof GridPane, node);
                }
                sb.append(']');
            }
            sb.append('}');
        }

        /**
         * "translateX", "translateY", "rotate" (each when it isn't 0, on any node) and "layoutX",
         * "layoutY" (when they aren't 0). Real VBox, HBox, StackPane, BorderPane, GridPane and
         * FlowPane relocate their children (which sets layoutX and layoutY), and Java Arena's
         * JavaFX, which doesn't lay windows out, never does: so the layout is written only for a
         * window's root and for the children of a plain Pane (the class Pane, or a program's own
         * class that extends it, as typeName names it), which resizes its children but never
         * moves them. They never touch translate or rotate.
         */
        private void transforms(Node node, Node parent) {
            nonZero("translateX", node.getTranslateX());
            nonZero("translateY", node.getTranslateY());
            if (parent == null || typeName(parent).equals("Pane")) {
                nonZero("layoutX", node.getLayoutX());
                nonZero("layoutY", node.getLayoutY());
            }
            nonZero("rotate", node.getRotate());
        }

        private void nonZero(String name, double value) {
            if (value != 0 || Double.isNaN(value)) {
                key(name);
                number(value);
            }
        }

        /** A node's own key handlers (Java Arena's JavaFX keeps them but sends key events only to the scene). */
        private void keyHandlers(Node node) {
            if (node.getOnKeyPressed() != null) {
                key("onKeyPressed").append("true");
            }
            if (node.getOnKeyReleased() != null) {
                key("onKeyReleased").append("true");
            }
            if (node.getOnKeyTyped() != null) {
                key("onKeyTyped").append("true");
            }
        }

        /**
         * A shape as WindowJson writes it: its geometry ("points"; "centerX", "centerY", "radius";
         * "x", "y", "width", "height"; "startX", "startY", "endX", "endY"; a Text's "x", "y"; a
         * Path's "area", its bounds in its own coordinates or null when empty), then "fill" (null
         * for none), "stroke" (when it has one) and "strokeWidth" (when it isn't 1). A value that
         * JavaFX's own style sheet gave counts as the default, as for the other nodes.
         */
        private void shape(Shape shape) {
            if (shape instanceof Polygon) {
                key("points").append('[');
                List<Double> points = ((Polygon) shape).getPoints();
                for (int i = 0; i < points.size(); i++) {
                    if (i > 0) {
                        sb.append(',');
                    }
                    Double p = points.get(i);
                    if (p == null) {
                        sb.append("null");
                    } else {
                        number(p);
                    }
                }
                sb.append(']');
            } else if (shape instanceof Circle) {
                Circle c = (Circle) shape;
                key("centerX");
                number(c.getCenterX());
                key("centerY");
                number(c.getCenterY());
                key("radius");
                number(c.getRadius());
            } else if (shape instanceof Rectangle) {
                Rectangle r = (Rectangle) shape;
                key("x");
                number(r.getX());
                key("y");
                number(r.getY());
                key("width");
                number(r.getWidth());
                key("height");
                number(r.getHeight());
            } else if (shape instanceof Line) {
                Line l = (Line) shape;
                key("startX");
                number(l.getStartX());
                key("startY");
                number(l.getStartY());
                key("endX");
                number(l.getEndX());
                key("endY");
                number(l.getEndY());
            } else if (shape instanceof Text) {
                Text t = (Text) shape;
                key("x");
                number(t.getX());
                key("y");
                number(t.getY());
            } else if (shape instanceof Path) {
                Bounds b = shape.getBoundsInLocal();
                key("area");
                if (b.isEmpty()) {
                    sb.append("null");
                } else {
                    sb.append('[');
                    number(b.getMinX());
                    sb.append(',');
                    number(b.getMinY());
                    sb.append(',');
                    number(b.getMaxX());
                    sb.append(',');
                    number(b.getMaxY());
                    sb.append(']');
                }
            }
            boolean line = shape instanceof Line;
            key("fill");
            paint(set(shape.fillProperty(), shape.getFill(), line ? null : Color.BLACK));
            Paint stroke = set(shape.strokeProperty(), shape.getStroke(), line ? Color.BLACK : null);
            if (stroke != null) {
                key("stroke");
                paint(stroke);
            }
            double width = set(shape.strokeWidthProperty(), shape.getStrokeWidth(), 1.0);
            if (width != 1) {
                key("strokeWidth");
                number(width);
            }
        }

        /** A color as WindowJson writes it: "#rrggbb", with "aa" when it isn't opaque; null for none. */
        private void paint(Paint paint) {
            if (paint == null) {
                sb.append("null");
                return;
            }
            if (!(paint instanceof Color)) {
                string(paint.toString());
                return;
            }
            Color c = (Color) paint;
            int a = (int) Math.round(c.getOpacity() * 255.0);
            StringBuilder s = new StringBuilder("\"#");
            hex(s, (int) Math.round(c.getRed() * 255.0));
            hex(s, (int) Math.round(c.getGreen() * 255.0));
            hex(s, (int) Math.round(c.getBlue() * 255.0));
            if (a != 255) {
                hex(s, a);
            }
            sb.append(s).append('"');
        }

        private void hex(StringBuilder s, int b) {
            s.append(Character.forDigit((b >> 4) & 15, 16)).append(Character.forDigit(b & 15, 16));
        }

        private void mouseHandlers(Node node) {
            if (node.getOnMousePressed() != null) {
                key("onMousePressed").append("true");
            }
            if (node.getOnMouseDragged() != null) {
                key("onMouseDragged").append("true");
            }
            if (node.getOnMouseReleased() != null) {
                key("onMouseReleased").append("true");
            }
            if (node.getOnMouseClicked() != null) {
                key("onMouseClicked").append("true");
            }
        }

        /**
         * A canvas: its size and mouse handlers, and, since real JavaFX doesn't tell what was drawn
         * on it, no calls ("calls":[]) but "snapshot": what it shows, from Canvas.snapshot on a
         * transparent background, as base64 of its RGBA bytes (not premultiplied), row by row, with
         * "snapshotWidth" and "snapshotHeight". fx-check compares it with the calls Java Arena's
         * JavaFX recorded, drawn with java.awt (see CanvasRaster.java).
         */
        private void canvas(Canvas canvas) {
            key("width");
            number(canvas.getWidth());
            key("height");
            number(canvas.getHeight());
            mouseHandlers(canvas);
            key("calls").append("[]");
            if (writingStep || canvas.getWidth() < 1 || canvas.getHeight() < 1) {
                return;
            }
            SnapshotParameters params = new SnapshotParameters();
            params.setFill(Color.TRANSPARENT);
            WritableImage shot = canvas.snapshot(params, null);
            int w = (int) shot.getWidth();
            int h = (int) shot.getHeight();
            int[] argb = new int[w * h];
            PixelReader r = shot.getPixelReader();
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    argb[y * w + x] = r.getArgb(x, y);
                }
            }
            key("snapshotWidth").append(w);
            key("snapshotHeight").append(h);
            key("snapshot").append('"').append(rgbaBase64(argb)).append('"');
        }

        /** An image view's image as Java Arena's JSON has it: null, {"error":...}, or its size, the CRC-32 of its pixels and (up to 512 x 512) the pixels. */
        private void imageView(ImageView view) {
            key("image");
            Image image = view.getImage();
            if (image == null) {
                sb.append("null");
                return;
            }
            if (image.isError()) {
                sb.append("{\"error\":");
                string(String.valueOf(image.getException()));
                sb.append('}');
                return;
            }
            int w = (int) image.getWidth();
            int h = (int) image.getHeight();
            int[] argb = new int[w * h];
            PixelReader r = image.getPixelReader();
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    argb[y * w + x] = r.getArgb(x, y);
                }
            }
            sb.append("{\"width\":");
            number(image.getWidth());
            key("height");
            number(image.getHeight());
            key("crc");
            string(crc(argb));
            if (w <= 512 && h <= 512) {
                key("pixels").append('"').append(rgbaBase64(argb)).append('"');
            }
            sb.append('}');
        }

        private void slider(Slider slider) {
            key("min");
            number(slider.getMin());
            key("max");
            number(slider.getMax());
            key("value");
            number(slider.getValue());
            key("majorTickUnit");
            number(slider.getMajorTickUnit());
            key("minorTickCount").append(slider.getMinorTickCount());
            key("blockIncrement");
            number(slider.getBlockIncrement());
            if (slider.isShowTickLabels()) {
                key("showTickLabels").append("true");
            }
            if (slider.isShowTickMarks()) {
                key("showTickMarks").append("true");
            }
            if (slider.isSnapToTicks()) {
                key("snapToTicks").append("true");
            }
        }

        private void chart(XYChart<?, ?> chart) {
            key("title");
            string(chart.getTitle());
            if (!chart.isLegendVisible()) {
                key("legendVisible").append("false");
            }
            if (chart instanceof LineChart && !((LineChart<?, ?>) chart).getCreateSymbols()) {
                key("createSymbols").append("false");
            }
            key("xAxis");
            axis(chart.getXAxis());
            key("yAxis");
            axis(chart.getYAxis());
            key("series");
            if (chart.getData() == null) {
                sb.append("null");
                return;
            }
            sb.append('[');
            List<? extends XYChart.Series<?, ?>> all = chart.getData();
            for (int i = 0; i < all.size(); i++) {
                if (i > 0) {
                    sb.append(',');
                }
                XYChart.Series<?, ?> s = all.get(i);
                if (s == null) {
                    sb.append("null");
                    continue;
                }
                sb.append("{\"name\":");
                string(s.getName());
                key("data");
                if (s.getData() == null) {
                    sb.append("null");
                } else {
                    sb.append('[');
                    List<? extends XYChart.Data<?, ?>> points = s.getData();
                    for (int j = 0; j < points.size(); j++) {
                        if (j > 0) {
                            sb.append(',');
                        }
                        XYChart.Data<?, ?> d = points.get(j);
                        if (d == null) {
                            sb.append("null");
                        } else {
                            sb.append('[');
                            value(d.getXValue());
                            sb.append(',');
                            value(d.getYValue());
                            sb.append(']');
                        }
                    }
                    sb.append(']');
                }
                sb.append('}');
            }
            sb.append(']');
        }

        private void axis(Axis<?> axis) {
            sb.append("{\"type\":");
            string(typeName(axis));
            key("label");
            string(axis.getLabel());
            key("autoRanging").append(axis.isAutoRanging());
            if (axis instanceof NumberAxis) {
                NumberAxis n = (NumberAxis) axis;
                key("lowerBound");
                number(n.getLowerBound());
                key("upperBound");
                number(n.getUpperBound());
                key("tickUnit");
                number(n.getTickUnit());
                key("forceZeroInRange").append(n.isForceZeroInRange());
                key("minorTickVisible").append(n.isMinorTickVisible());
            } else if (axis instanceof CategoryAxis) {
                key("categories").append('[');
                List<String> categories = ((CategoryAxis) axis).getCategories();
                for (int i = 0; i < categories.size(); i++) {
                    if (i > 0) {
                        sb.append(',');
                    }
                    string(categories.get(i));
                }
                sb.append(']');
            }
            sb.append('}');
        }

        /** A data point's value as Java Arena's JSON writes it: a number (whole numbers as they are), a text, or null. */
        private void value(Object v) {
            if (v == null) {
                sb.append("null");
            } else if (v instanceof Integer || v instanceof Long || v instanceof Short || v instanceof Byte || v instanceof java.math.BigInteger) {
                sb.append(v.toString());
            } else if (v instanceof Float && !((Float) v).isNaN() && !((Float) v).isInfinite()) {
                sb.append(v.toString());
            } else if (v instanceof Number) {
                number(((Number) v).doubleValue());
            } else {
                string(String.valueOf(v));
            }
        }

        private void region(String name, Node child) {
            if (child != null) {
                key(name);
                // A BorderPane relocates its regions, so their layout isn't written (see transforms).
                node(child, false, child.getParent());
            }
        }

        private StringBuilder key(String name) {
            return sb.append(",\"").append(name).append("\":");
        }

        private void number(double value) {
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                sb.append('"').append(Double.toString(value)).append('"');
            } else {
                sb.append(Double.toString(value));
            }
        }

        private void string(String s) {
            if (s == null) {
                sb.append("null");
                return;
            }
            sb.append('"');
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                if (c == '"' || c == '\\') {
                    sb.append('\\').append(c);
                } else if (c == '\n') {
                    sb.append("\\n");
                } else if (c == '\r') {
                    sb.append("\\r");
                } else if (c == '\t') {
                    sb.append("\\t");
                } else if (c == '\b') {
                    sb.append("\\b");
                } else if (c == '\f') {
                    sb.append("\\f");
                } else if (c < 0x20 || c >= 0x7F) {
                    sb.append(String.format("\\u%04x", (int) c));
                } else {
                    sb.append(c);
                }
            }
            sb.append('"');
        }
    }
}
