// Part of Java Arena's real-JavaFX check (npm run fx-check): written for this site, not OpenJFX's code.
package arena.fxcheck;

import java.io.File;
import java.io.IOException;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import javafx.application.Platform;
import javafx.collections.ListChangeListener;
import javafx.css.StyleOrigin;
import javafx.css.StyleableProperty;
import javafx.event.ActionEvent;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.ButtonBase;
import javafx.scene.control.Labeled;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputControl;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
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
 * type calls appendText once per character, set calls setText, enter fires an ActionEvent at the
 * text field (what pressing Enter does), close closes the primary stage. Then it writes OUT and
 * calls Platform.exit(), so stop() runs and launch returns. When the session ends earlier
 * (Platform.exit(), or the last window closed), OUT says the windows were closed; when the
 * constructor, init or start fails, there is no OUT, as with Java Arena's JavaFX.
 *
 * <p>EVENTS is written by scripts/fx-check/fx-check.mjs, which reads the event lines with
 * src/grader/window.ts (the same reading as the library's): one event per line, fields separated
 * by spaces, each field its UTF-16 code units as four hexadecimal digits ("=" for an empty text,
 * "-" for none): {@code P line problem} for a line that can't be read, or {@code E line command
 * kind type value text} where kind is none, number, id, text or index.
 *
 * <p>The window JSON follows engine/libraries/javafx/src/arena/fx/WindowJson.java, from the real
 * scene graph, but without the sizes of windows and scenes (the outline leaves them out, and real
 * JavaFX lays windows out). Values that JavaFX's own style sheet (modena.css) gave a node, such as
 * a button's padding, count as not set: the program didn't choose them, and Java Arena's JavaFX
 * has no style sheet. Values that the program's own styles (setStyle) gave a node count as set,
 * since that is what the window shows.
 */
public final class RealFxDriver {
    private static final Object LOCK = new Object();
    private static final List<Event> EVENTS = new ArrayList<Event>();
    private static File out;

    /** The stages shown in this session, in the order each was first shown (kept on the FX thread). */
    private static final List<Stage> FIRST_SHOWN = new ArrayList<Stage>();
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
                    }
                }
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
        if (next < EVENTS.size()) {
            Event e = EVENTS.get(next++);
            String problem = e.problem;
            if (problem == null) {
                try {
                    problem = apply(e);
                } catch (Throwable t) {
                    Thread.currentThread().getUncaughtExceptionHandler().uncaughtException(Thread.currentThread(), t);
                }
            }
            if (problem != null) {
                PROBLEMS.add(e.line + ": " + problem);
            }
            later();
            return;
        }
        dump(false);
        Platform.exit();
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

    private static void dump(boolean closed) {
        String json;
        synchronized (LOCK) {
            if (dumped) {
                return;
            }
            dumped = true;
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
        if (command.equals("click")) {
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
    private static final List<String> TYPES = Arrays.asList("Node", "Parent", "Region", "Pane", "FlowPane", "HBox", "VBox", "StackPane", "BorderPane", "GridPane", "Control", "Labeled", "Label", "ButtonBase", "Button", "TextInputControl", "TextField", "PasswordField", "TextArea");

    /** The nearest class that Java Arena's JavaFX has (a program's class MenuView extends VBox is a VBox). */
    private static String typeName(Node node) {
        for (Class<?> c = node.getClass(); c != null; c = c.getSuperclass()) {
            String name = c.getName();
            if (name.startsWith("javafx.") && TYPES.contains(name.substring(name.lastIndexOf('.') + 1))) {
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
                    sb.append("{\"root\":");
                    node(scene.getRoot(), false);
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
            sb.append("]}");
            return sb.toString();
        }

        private void node(Node node, boolean inGrid) {
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
                    : node instanceof TextInputControl ? set(((TextInputControl) node).fontProperty(), ((TextInputControl) node).getFont(), Font.getDefault()) : Font.getDefault();
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
                    node(children.get(i), node instanceof GridPane);
                }
                sb.append(']');
            }
            sb.append('}');
        }

        private void region(String name, Node child) {
            if (child != null) {
                key(name);
                node(child, false);
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
