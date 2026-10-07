// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.layout;

import javafx.geometry.Pos;
import javafx.scene.Node;

/** A pane that places its children on top of each other, centered unless told otherwise. */
public class StackPane extends Pane {
    private Pos alignment = Pos.CENTER;

    public StackPane() {
    }

    public StackPane(Node... children) {
        super(children);
    }

    public final void setAlignment(Pos value) {
        alignment = value;
    }

    public final Pos getAlignment() {
        return alignment;
    }
}
