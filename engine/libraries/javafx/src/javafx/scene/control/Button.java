// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.control;

import arena.fx.Actions;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;

/** A button: clicking it (or calling fire()) runs its onAction handler. */
public class Button extends ButtonBase {
    public Button() {
    }

    public Button(String text) {
        super(text);
    }

    /** Presses the button: runs its onAction handler, unless the button or a pane it is in is disabled. */
    @Override
    public void fire() {
        if (isDisabled()) {
            return;
        }
        EventHandler<ActionEvent> handler = getOnAction();
        if (handler != null) {
            handler.handle(Actions.create(this));
        }
    }
}
