// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.layout;

import javafx.geometry.Pos;
import javafx.scene.Node;

/** A pane that places its children in a row that wraps onto the next line when it runs out of room. */
public class FlowPane extends Pane {
    private double hgap;
    private double vgap;
    private Pos alignment = Pos.TOP_LEFT;

    public FlowPane() {
    }

    public FlowPane(Node... children) {
        super(children);
    }

    public FlowPane(double hgap, double vgap) {
        this.hgap = hgap;
        this.vgap = vgap;
    }

    public final void setHgap(double value) {
        hgap = value;
    }

    public final double getHgap() {
        return hgap;
    }

    public final void setVgap(double value) {
        vgap = value;
    }

    public final double getVgap() {
        return vgap;
    }

    public final void setAlignment(Pos value) {
        alignment = value;
    }

    public final Pos getAlignment() {
        return alignment;
    }
}
