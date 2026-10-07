// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import javafx.event.ActionEvent;

/** Makes the ActionEvent a button or a text field passes to its handler, with that control as its source. */
public final class Actions {
    /** ActionEvent registers one of these, so the event's source can be set without a public constructor for it. */
    public interface Factory {
        ActionEvent create(Object source);
    }

    private static Factory factory;

    private Actions() {
    }

    public static synchronized void register(Factory f) {
        if (factory == null) {
            factory = f;
        }
    }

    public static ActionEvent create(Object source) {
        Factory f;
        synchronized (Actions.class) {
            f = factory;
        }
        if (f == null) {
            // Loading ActionEvent registers its factory.
            new ActionEvent();
            synchronized (Actions.class) {
                f = factory;
            }
        }
        return f.create(source);
    }
}
