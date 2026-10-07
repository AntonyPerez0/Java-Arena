// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.event;

/** Something that happened in the user interface, such as a button being pressed. */
public class Event extends java.util.EventObject {
    private static final long serialVersionUID = 20161L;

    /** The source of an event that no node fired. */
    private static final Object NO_SOURCE = new Object();

    /** An event with no source yet: the node that fires it becomes its source. */
    protected Event() {
        super(NO_SOURCE);
    }
}
