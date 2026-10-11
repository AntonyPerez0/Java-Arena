// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.event;

/** The kind of an event, such as MouseEvent.MOUSE_PRESSED. It prints as its name. */
public final class EventType<T extends Event> implements java.io.Serializable {
    private static final long serialVersionUID = 20171L;

    static {
        arena.fx.EventTypes.register(new arena.fx.EventTypes.Factory() {
            @Override
            public EventType<?> create(String name) {
                return new EventType<Event>(name);
            }
        });
    }

    private final String name;

    private EventType(String name) {
        this.name = name;
    }

    /** The name, such as MOUSE_PRESSED. */
    public final String getName() {
        return name;
    }

    @Override
    public String toString() {
        return name;
    }
}
