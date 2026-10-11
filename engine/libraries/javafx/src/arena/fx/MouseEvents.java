// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import javafx.event.EventType;
import javafx.scene.input.MouseEvent;

/** Makes the MouseEvent a node's handler gets, with that node as its source (MouseEvent has no public constructor here). */
public final class MouseEvents {
    /** MouseEvent registers one of these when it is loaded. */
    public interface Factory {
        MouseEvent create(Object node, EventType<MouseEvent> type, double x, double y);
    }

    private static Factory factory;

    private MouseEvents() {
    }

    public static synchronized void register(Factory f) {
        if (factory == null) {
            factory = f;
        }
    }

    public static MouseEvent create(Object node, EventType<MouseEvent> type, double x, double y) {
        Factory f;
        synchronized (MouseEvents.class) {
            f = factory;
        }
        if (f == null) {
            // Reading one of MouseEvent's types loads it, which registers its factory.
            if (MouseEvent.MOUSE_PRESSED == null) {
                throw new IllegalStateException("MouseEvent isn't loaded");
            }
            synchronized (MouseEvents.class) {
                f = factory;
            }
        }
        return f.create(node, type, x, y);
    }
}
