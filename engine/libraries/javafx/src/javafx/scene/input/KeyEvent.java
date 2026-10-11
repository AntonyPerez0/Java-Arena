// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.input;

import javafx.event.EventType;

/**
 * A key was pressed, released or typed. In Java Arena key events go to the scene (no node has the
 * focus): KEY_PRESSED and KEY_RELEASED carry the key's code (getCode()) and the text it makes
 * (getText(): "a" for A, "" for an arrow key); a key that makes a character is also typed:
 * KEY_TYPED comes right after its KEY_PRESSED, with the character (getCharacter()) and the code
 * UNDEFINED. The modifier keys (Shift and the rest) are never down here.
 */
public final class KeyEvent extends InputEvent {
    private static final long serialVersionUID = 20172L;

    /** The character of a pressed or released key event: none. */
    public static final String CHAR_UNDEFINED = KeyCode.UNDEFINED.getChar();

    /** Any key event. */
    public static final EventType<KeyEvent> ANY = arena.fx.EventTypes.create("KEY");
    public static final EventType<KeyEvent> KEY_PRESSED = arena.fx.EventTypes.create("KEY_PRESSED");
    public static final EventType<KeyEvent> KEY_RELEASED = arena.fx.EventTypes.create("KEY_RELEASED");
    public static final EventType<KeyEvent> KEY_TYPED = arena.fx.EventTypes.create("KEY_TYPED");

    static {
        arena.fx.Keys.register(new arena.fx.Keys.Factory() {
            @Override
            public KeyEvent create(Object source, EventType<KeyEvent> type, String character, String text, KeyCode code) {
                KeyEvent event = new KeyEvent(type, character, text, code, false, false, false, false);
                event.source = source;
                return event;
            }
        });
    }

    private final EventType<KeyEvent> eventType;
    private final String character;
    private final String text;
    private final KeyCode code;
    private final boolean shiftDown;
    private final boolean controlDown;
    private final boolean altDown;
    private final boolean metaDown;

    /**
     * As in JavaFX: a KEY_TYPED event keeps the character and has the code UNDEFINED and no text; a
     * pressed or released one keeps the text and the code and has the character CHAR_UNDEFINED.
     */
    public KeyEvent(EventType<KeyEvent> eventType, String character, String text, KeyCode code, boolean shiftDown, boolean controlDown, boolean altDown, boolean metaDown) {
        boolean typed = eventType == KEY_TYPED;
        this.eventType = eventType;
        this.character = typed ? character : CHAR_UNDEFINED;
        this.text = typed ? "" : text;
        this.code = typed ? KeyCode.UNDEFINED : code;
        this.shiftDown = shiftDown;
        this.controlDown = controlDown;
        this.altDown = altDown;
        this.metaDown = metaDown;
    }

    /** KEY_PRESSED, KEY_RELEASED or KEY_TYPED. */
    public EventType<KeyEvent> getEventType() {
        return eventType;
    }

    /** The character typed (KEY_TYPED), or CHAR_UNDEFINED. */
    public final String getCharacter() {
        return character;
    }

    /** The text the key makes, such as "a" (KEY_PRESSED and KEY_RELEASED), or "". */
    public final String getText() {
        return text;
    }

    /** The key (KEY_PRESSED and KEY_RELEASED), or UNDEFINED (KEY_TYPED). */
    public final KeyCode getCode() {
        return code;
    }

    public final boolean isShiftDown() {
        return shiftDown;
    }

    public final boolean isControlDown() {
        return controlDown;
    }

    public final boolean isAltDown() {
        return altDown;
    }

    public final boolean isMetaDown() {
        return metaDown;
    }

    /** Control on Linux and Windows. */
    public final boolean isShortcutDown() {
        return controlDown;
    }

    /** As JavaFX writes it: KeyEvent [source = ..., target = ..., eventType = KEY_PRESSED, consumed = false, character = ..., text = a, code = A]. */
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("KeyEvent [source = ").append(getSource()).append(", target = ").append(getSource());
        sb.append(", eventType = ").append(eventType).append(", consumed = false, character = ").append(character).append(", text = ").append(text).append(", code = ").append(code);
        if (shiftDown) {
            sb.append(", shiftDown");
        }
        if (controlDown) {
            sb.append(", controlDown");
        }
        if (altDown) {
            sb.append(", altDown");
        }
        if (metaDown) {
            sb.append(", metaDown");
        }
        if (controlDown) {
            // The shortcut key is Control on Linux and Windows.
            sb.append(", shortcutDown");
        }
        return sb.append(']').toString();
    }
}
