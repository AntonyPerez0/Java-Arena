// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import javafx.event.EventHandler;
import javafx.event.EventType;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.stage.Window;

/**
 * The key event lines: press key LEFT, release key LEFT and key SPACE (a press, the tasks it
 * queued, then a release). Key events go to the scene of the window shown last (JavaFX gives a
 * window the focus when it shows): no node has the focus here, so only the scene's handlers run.
 * When the program called requestFocus() on a node that (or a pane around which) has its own key
 * handler, real JavaFX would run that one first: the line then gets a problem saying so (once per
 * type of key event).
 *
 * <p>As on OpenJFX 21.0.12 (with its headless platform's US keyboard, the Shift key up): a key
 * that makes a character (a letter, a digit, Space, Enter, Tab and the punctuation keys listed in
 * TEXTS) has it as its text on KEY_PRESSED and KEY_RELEASED ("a" for A), and its KEY_TYPED comes
 * right after the KEY_PRESSED; other keys (the arrows, Shift, Escape) have the text "" and no
 * KEY_TYPED. A desktop can differ for Enter and the punctuation keys: there Enter's text and
 * typed character are usually "\r", and the [ and ] keys come as OPEN_BRACKET and CLOSE_BRACKET
 * with the texts "[" and "]" (the headless platform gives those to BRACELEFT and BRACERIGHT). Letters,
 * digits, Space and the arrows are the same everywhere. A held key is held until it is released: no
 * KEY_PRESSED repeats (on a real computer the system repeats it while the key is held).
 */
public final class Keys {
    /** KeyEvent registers one of these when it is loaded (its constructor can't set the source). */
    public interface Factory {
        KeyEvent create(Object source, EventType<KeyEvent> type, String character, String text, KeyCode code);
    }

    private static Factory factory;

    public static synchronized void register(Factory f) {
        if (factory == null) {
            factory = f;
        }
    }

    private static Factory factory() {
        synchronized (Keys.class) {
            if (factory == null) {
                try {
                    Class.forName(KeyEvent.class.getName(), true, Keys.class.getClassLoader());
                } catch (ClassNotFoundException e) {
                    throw new IllegalStateException(e);
                }
            }
            return factory;
        }
    }

    /** The keys that make a character, and the character (a key and its text, one after the other). */
    private static final String[] TEXTS = {
        "ENTER", "\n", "TAB", "\t", "SPACE", " ", "COMMA", ",", "MINUS", "-", "PERIOD", ".", "SLASH", "/", "SEMICOLON", ";", "EQUALS", "=",
        "BACK_SLASH", "\\", "MULTIPLY", "*", "DIVIDE", "/", "BACK_QUOTE", "`", "QUOTE", "'", "BRACELEFT", "[", "BRACERIGHT", "]",
    };

    /** The text a key makes, or "". */
    static String textOf(KeyCode code) {
        String name = code.name();
        if (code.isLetterKey()) {
            return name.toLowerCase(Locale.ROOT);
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

    private static final Set<KeyCode> HELD = new HashSet<KeyCode>();

    /** The node requestFocus() was called on last (it doesn't get the keys here), or null. */
    private static Node focusRequest;
    /** The key event types whose node handler a hint was already given for (once each per session). */
    private static final Set<EventType<KeyEvent>> HINTED = new HashSet<EventType<KeyEvent>>();

    /** Node.requestFocus(): remembered, so a key line can say that the node's own handlers don't run here. */
    public static synchronized void focusRequested(Node node) {
        focusRequest = node;
    }

    private Keys() {
    }

    /** Applies a key event line. Returns why it couldn't happen, or null. */
    static String apply(EventLine event) {
        KeyCode code = KeyCode.valueOf(event.argument);
        Window window = Session.focusedWindow();
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
            return fire(scene, KeyEvent.KEY_RELEASED, code, null);
        }
        if (held) {
            return name + " is already held down (press key " + name + " came before): release key " + name + " first";
        }
        HELD.add(code);
        String hint = fire(scene, KeyEvent.KEY_PRESSED, code, null);
        if (!textOf(code).isEmpty()) {
            hint = fire(scene, KeyEvent.KEY_TYPED, code, hint);
        }
        if (event.command.equals("key")) {
            Session.drain();
            HELD.remove(code);
            // The press and the release are two events: once the session has ended (Platform.exit(),
            // or no window shows any more) no release comes, as on real JavaFX. A window closed
            // while another still shows doesn't end it: the release still goes to this scene.
            if (Session.exitRequested() || Session.showingWindows().isEmpty()) {
                return hint;
            }
            hint = fire(scene, KeyEvent.KEY_RELEASED, code, hint);
        }
        return hint;
    }

    /**
     * When the program called requestFocus() on a node of this scene that (or a pane around which)
     * has its own handler for this type, real JavaFX would run that handler first (the focused node
     * gets the key, and it bubbles up to the scene); here keys go only to the scene's handlers. The
     * line then gets a problem saying so, once per type of key event in a session (so a long test
     * doesn't fill the list). Returns the hint, or null.
     */
    private static String nodeHint(Scene scene, EventType<KeyEvent> type) {
        Node focus;
        synchronized (Keys.class) {
            focus = focusRequest;
        }
        if (focus == null || focus.getScene() != scene || HINTED.contains(type)) {
            return null;
        }
        String setter = type == KeyEvent.KEY_PRESSED ? "setOnKeyPressed" : type == KeyEvent.KEY_RELEASED ? "setOnKeyReleased" : "setOnKeyTyped";
        for (Node n = focus; n != null; n = n.getParent()) {
            EventHandler<? super KeyEvent> handler = type == KeyEvent.KEY_PRESSED ? n.getOnKeyPressed() : type == KeyEvent.KEY_RELEASED ? n.getOnKeyReleased() : n.getOnKeyTyped();
            if (handler != null) {
                HINTED.add(type);
                String where = n == focus ? "a node with its own " + setter : "a node inside a pane with its own " + setter;
                return "the program called requestFocus() on " + where + ", which real JavaFX would run first; in Java Arena keys go only to the scene's handlers (put it on the scene: scene." + setter + ")";
            }
        }
        return null;
    }

    /** Fires the event at the scene's handler; returns hint, or (when hint is null) the hint about a node's handler for this type, if any. */
    private static String fire(Scene scene, EventType<KeyEvent> type, KeyCode code, String hint) {
        if (hint == null) {
            hint = nodeHint(scene, type);
        }
        fireAtScene(scene, type, code);
        return hint;
    }

    private static void fireAtScene(Scene scene, EventType<KeyEvent> type, KeyCode code) {
        EventHandler<? super KeyEvent> handler = type == KeyEvent.KEY_PRESSED ? scene.getOnKeyPressed() : type == KeyEvent.KEY_RELEASED ? scene.getOnKeyReleased() : scene.getOnKeyTyped();
        if (handler == null) {
            return;
        }
        String text = textOf(code);
        KeyEvent event = type == KeyEvent.KEY_TYPED ? factory().create(scene, type, text, "", KeyCode.UNDEFINED) : factory().create(scene, type, KeyEvent.CHAR_UNDEFINED, text, code);
        try {
            handler.handle(event);
        } catch (Throwable t) {
            Session.uncaught(t);
        }
    }

    // ------------------------------------------------------------------ key names in event lines

    /** Other names people give keys, and KeyCode's. */
    private static final String[] ALIASES = {
        "ESC", "ESCAPE", "CTRL", "CONTROL", "SPACEBAR", "SPACE", "RETURN", "ENTER", "DEL", "DELETE", "BACKSPACE", "BACK_SPACE",
        "ARROWLEFT", "LEFT", "ARROWRIGHT", "RIGHT", "ARROWUP", "UP", "ARROWDOWN", "DOWN", "LEFTARROW", "LEFT", "RIGHTARROW", "RIGHT",
        "UPARROW", "UP", "DOWNARROW", "DOWN", "PGUP", "PAGE_UP", "PGDN", "PAGE_DOWN", "INS", "INSERT",
    };

    /**
     * Why a key's name in an event line isn't one of KeyCode's, naming the closest real one; null
     * when it is one. The same words as src/grader/window.ts's keyNameProblem.
     */
    static String nameProblem(String word) {
        KeyCode[] all = KeyCode.values();
        for (KeyCode k : all) {
            if (k.name().equals(word)) {
                return null;
            }
        }
        String upper = upper(word);
        for (KeyCode k : all) {
            if (k.name().equals(upper)) {
                return "write the key's name in capital letters, as KeyCode names it: " + upper;
            }
        }
        String suggestion = suggest(word, upper, all);
        return "there's no key called " + word + " (did you mean " + suggestion + "? keys are named as in KeyCode, such as LEFT, UP, SPACE, A and DIGIT1)";
    }

    /** ASCII letters in capitals (the same in every locale, and in JavaScript). */
    private static String upper(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            sb.append(c >= 'a' && c <= 'z' ? (char) (c - 32) : c);
        }
        return sb.toString();
    }

    private static String suggest(String word, String upper, KeyCode[] all) {
        if (word.length() == 1 && word.charAt(0) >= '0' && word.charAt(0) <= '9') {
            return "DIGIT" + word;
        }
        String bare = upper.replace("_", "").replace("-", "").replace(" ", "");
        for (KeyCode k : all) {
            if (k.name().replace("_", "").equals(bare)) {
                return k.name();
            }
        }
        for (int i = 0; i < ALIASES.length; i += 2) {
            if (ALIASES[i].equals(bare)) {
                return ALIASES[i + 1];
            }
        }
        String best = null;
        int bestDistance = Integer.MAX_VALUE;
        for (KeyCode k : all) {
            int d = distance(upper, k.name());
            if (d < bestDistance) {
                bestDistance = d;
                best = k.name();
            }
        }
        return best;
    }

    /** The edit distance (insertions, deletions and changes of one UTF-16 unit) between a and b. */
    static int distance(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] cur = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            prev[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(Math.min(cur[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            int[] t = prev;
            prev = cur;
            cur = t;
        }
        return prev[b.length()];
    }
}
