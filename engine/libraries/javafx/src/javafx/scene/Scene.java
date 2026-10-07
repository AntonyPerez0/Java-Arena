// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene;

import arena.fx.Session;

/**
 * What a window shows: a root node (usually a pane) and everything in it. Java Arena doesn't lay
 * windows out, so a scene's size is the size it was given, or 0 when none was given.
 */
public class Scene {
    private Parent root;
    private final double width;
    private final double height;

    public Scene(Parent root) {
        this.width = 0;
        this.height = 0;
        attach(root, "Root cannot be null");
    }

    public Scene(Parent root, double width, double height) {
        this.width = width;
        this.height = height;
        attach(root, "Root cannot be null");
        Session.sceneSized(this, width, height);
    }

    private void attach(Parent value, String ifNull) {
        if (value == null) {
            throw new NullPointerException(ifNull);
        }
        if (value == root) {
            return;
        }
        if (value.parent != null) {
            throw new IllegalArgumentException(value + "is already inside a scene-graph and cannot be set as root");
        }
        if (value.rootOf != null && value.rootOf != this) {
            throw new IllegalArgumentException(value + "is already set as root of another scene");
        }
        if (root != null) {
            root.rootOf = null;
        }
        root = value;
        value.rootOf = this;
    }

    public final Parent getRoot() {
        return root;
    }

    public final void setRoot(Parent value) {
        attach(value, "Scene's root cannot be null");
    }

    /** The width given to the constructor, or 0. */
    public final double getWidth() {
        return width;
    }

    /** The height given to the constructor, or 0. */
    public final double getHeight() {
        return height;
    }
}
