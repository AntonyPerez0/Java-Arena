// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.control;

import javafx.event.ActionEvent;
import javafx.event.EventHandler;

/** A control that can be pressed. */
public abstract class ButtonBase extends Labeled {
    private EventHandler<ActionEvent> onAction;

    public ButtonBase() {
    }

    public ButtonBase(String text) {
        super(text);
    }

    /** The code to run when the button is pressed (fire()). */
    public final void setOnAction(EventHandler<ActionEvent> value) {
        onAction = value;
    }

    public final EventHandler<ActionEvent> getOnAction() {
        return onAction;
    }

    /** Presses the button: runs its onAction handler, unless the button is disabled. */
    public abstract void fire();
}
