// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.event;

/** Code that handles an event, such as a button's action: usually a lambda, e -> { ... }. */
@FunctionalInterface
public interface EventHandler<T extends Event> extends java.util.EventListener {
    void handle(T event);
}
