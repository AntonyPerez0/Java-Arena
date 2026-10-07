// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.control;

import javafx.event.ActionEvent;
import javafx.event.EventHandler;

/** A one-line text field. Pressing Enter in it runs its onAction handler. */
public class TextField extends TextInputControl {
    private EventHandler<ActionEvent> onAction;

    public TextField() {
        super(false);
    }

    public TextField(String text) {
        super(false);
        setText(text);
    }

    /** The code to run when Enter is pressed in the field. */
    public final void setOnAction(EventHandler<ActionEvent> value) {
        onAction = value;
    }

    public final EventHandler<ActionEvent> getOnAction() {
        return onAction;
    }
}
