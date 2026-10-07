// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.layout;

import javafx.geometry.Pos;
import javafx.scene.Node;

/** A pane that places its children in a row, from left to right, with spacing between them. */
public class HBox extends Pane {
    private double spacing;
    private Pos alignment = Pos.TOP_LEFT;

    public HBox() {
    }

    public HBox(double spacing) {
        this.spacing = spacing;
    }

    public HBox(Node... children) {
        super(children);
    }

    public HBox(double spacing, Node... children) {
        super(children);
        this.spacing = spacing;
    }

    public final void setSpacing(double value) {
        spacing = value;
    }

    public final double getSpacing() {
        return spacing;
    }

    public final void setAlignment(Pos value) {
        alignment = value;
    }

    public final Pos getAlignment() {
        return alignment;
    }
}
