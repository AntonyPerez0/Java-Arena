// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.input;

import javafx.event.EventType;

/**
 * The mouse was pressed, dragged, released or clicked on a node. getX() and getY() are in the
 * node's own coordinates (0, 0 is its top left corner). getSceneX() and getSceneY() are the same
 * numbers here: Java Arena doesn't lay windows out, so it doesn't know where the node is in its
 * scene. getSource() is the node.
 */
public class MouseEvent extends InputEvent {
    private static final long serialVersionUID = 20171L;

    /** The mouse button was pressed on the node. */
    public static final EventType<MouseEvent> MOUSE_PRESSED = arena.fx.EventTypes.create("MOUSE_PRESSED");
    /** The mouse moved while its button was down, after it was pressed on the node. */
    public static final EventType<MouseEvent> MOUSE_DRAGGED = arena.fx.EventTypes.create("MOUSE_DRAGGED");
    /** The mouse button was released, after it was pressed on the node. */
    public static final EventType<MouseEvent> MOUSE_RELEASED = arena.fx.EventTypes.create("MOUSE_RELEASED");
    /** The mouse button was pressed and released on the node (also after it moved in between). */
    public static final EventType<MouseEvent> MOUSE_CLICKED = arena.fx.EventTypes.create("MOUSE_CLICKED");

    static {
        arena.fx.MouseEvents.register(new arena.fx.MouseEvents.Factory() {
            @Override
            public MouseEvent create(Object node, EventType<MouseEvent> type, double x, double y) {
                MouseEvent event = new MouseEvent(type, x, y);
                event.source = node;
                return event;
            }
        });
    }

    private final EventType<MouseEvent> eventType;
    private final double x;
    private final double y;

    private MouseEvent(EventType<MouseEvent> eventType, double x, double y) {
        this.eventType = eventType;
        this.x = x;
        this.y = y;
    }

    /** MOUSE_PRESSED, MOUSE_DRAGGED, MOUSE_RELEASED or MOUSE_CLICKED. */
    public EventType<? extends MouseEvent> getEventType() {
        return eventType;
    }

    /** Where the mouse is, across the node from its left edge. */
    public final double getX() {
        return x;
    }

    /** Where the mouse is, down the node from its top edge. */
    public final double getY() {
        return y;
    }

    /** The same as getX() here (Java Arena doesn't lay windows out). */
    public final double getSceneX() {
        return x;
    }

    /** The same as getY() here (Java Arena doesn't lay windows out). */
    public final double getSceneY() {
        return y;
    }

    /** Like JavaFX's, without the parts Java Arena doesn't have (the pick result). */
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("MouseEvent [source = ").append(getSource()).append(", target = ").append(getSource());
        sb.append(", eventType = ").append(eventType).append(", consumed = false, x = ").append(x).append(", y = ").append(y).append(", z = 0.0, button = PRIMARY");
        if (eventType == MOUSE_PRESSED || eventType == MOUSE_DRAGGED) {
            sb.append(", primaryButtonDown");
        }
        return sb.append(']').toString();
    }
}
