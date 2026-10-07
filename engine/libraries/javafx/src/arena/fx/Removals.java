// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.IdentityHashMap;
import javafx.scene.Node;
import javafx.scene.Parent;

/** Lets a pane hear that a child left its children list (a BorderPane then forgets that region). */
public final class Removals {
    public interface Hook {
        void removed(Node child);
    }

    private static final IdentityHashMap<Parent, Hook> HOOKS = new IdentityHashMap<Parent, Hook>();

    private Removals() {
    }

    public static synchronized void register(Parent parent, Hook hook) {
        HOOKS.put(parent, hook);
    }

    public static void removed(Parent parent, Node child) {
        Hook hook;
        synchronized (Removals.class) {
            hook = HOOKS.get(parent);
        }
        if (hook != null) {
            hook.removed(child);
        }
    }
}
