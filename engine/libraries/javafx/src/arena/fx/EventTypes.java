// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import javafx.event.Event;
import javafx.event.EventType;

/** Makes the event types of the library's events (EventType has no public constructor here). */
public final class EventTypes {
    /** EventType registers one of these when it is loaded. */
    public interface Factory {
        EventType<?> create(String name);
    }

    private static Factory factory;

    private EventTypes() {
    }

    public static synchronized void register(Factory f) {
        if (factory == null) {
            factory = f;
        }
    }

    /** A new event type with this name. */
    @SuppressWarnings("unchecked")
    public static <T extends Event> EventType<T> create(String name) {
        Factory f;
        synchronized (EventTypes.class) {
            f = factory;
        }
        if (f == null) {
            try {
                // Loading EventType registers its factory.
                Class.forName(EventType.class.getName(), true, EventTypes.class.getClassLoader());
            } catch (ClassNotFoundException e) {
                throw new IllegalStateException(e);
            }
            synchronized (EventTypes.class) {
                f = factory;
            }
        }
        return (EventType<T>) f.create(name);
    }
}
