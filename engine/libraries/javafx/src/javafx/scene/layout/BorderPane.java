// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.layout;

import arena.fx.Removals;
import javafx.scene.Node;

/**
 * A pane with five regions: top, left, center, right and bottom. Setting a region replaces the
 * node that was there, and the children list always holds the nodes of the regions. A node that
 * leaves the children list (taken out, or added to another pane) leaves its region too.
 */
public class BorderPane extends Pane {
    private static final int TOP = 0;
    private static final int LEFT = 1;
    private static final int CENTER = 2;
    private static final int RIGHT = 3;
    private static final int BOTTOM = 4;

    private final Node[] regions = new Node[5];

    public BorderPane() {
        Removals.register(this, new Removals.Hook() {
            @Override
            public void removed(Node child) {
                forget(child);
            }
        });
    }

    public BorderPane(Node center) {
        this();
        setCenter(center);
    }

    public BorderPane(Node center, Node top, Node right, Node bottom, Node left) {
        this();
        setCenter(center);
        setTop(top);
        setRight(right);
        setBottom(bottom);
        setLeft(left);
    }

    private void forget(Node child) {
        for (int i = 0; i < regions.length; i++) {
            if (regions[i] == child) {
                regions[i] = null;
            }
        }
    }

    private void set(int region, Node value) {
        Node old = regions[region];
        if (old == value) {
            return;
        }
        regions[region] = value;
        if (old != null) {
            getChildren().remove(old);
        }
        if (value != null) {
            getChildren().add(value);
        }
    }

    public final void setTop(Node value) {
        set(TOP, value);
    }

    public final Node getTop() {
        return regions[TOP];
    }

    public final void setLeft(Node value) {
        set(LEFT, value);
    }

    public final Node getLeft() {
        return regions[LEFT];
    }

    public final void setCenter(Node value) {
        set(CENTER, value);
    }

    public final Node getCenter() {
        return regions[CENTER];
    }

    public final void setRight(Node value) {
        set(RIGHT, value);
    }

    public final Node getRight() {
        return regions[RIGHT];
    }

    public final void setBottom(Node value) {
        set(BOTTOM, value);
    }

    public final Node getBottom() {
        return regions[BOTTOM];
    }
}
