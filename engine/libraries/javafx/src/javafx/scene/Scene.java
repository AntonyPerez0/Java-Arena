// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene;

import arena.fx.Session;
import javafx.event.EventHandler;
import javafx.scene.input.KeyEvent;

/**
 * What a window shows: a root node (usually a pane) and everything in it. Java Arena doesn't lay
 * windows out, so a scene's size is the size it was given, or 0 when none was given; as in JavaFX,
 * a scene made without a size whose root pane has a preferred size takes it when its window shows.
 */
public class Scene {
    private Parent root;
    private EventHandler<? super KeyEvent> onKeyPressed;
    private EventHandler<? super KeyEvent> onKeyReleased;
    private EventHandler<? super KeyEvent> onKeyTyped;

    public Scene(Parent root) {
        attach(root, "Root cannot be null");
    }

    public Scene(Parent root, double width, double height) {
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

    /** The code to run when a key is pressed in this scene's window (the key events of event lines come here). */
    public final void setOnKeyPressed(EventHandler<? super KeyEvent> value) {
        onKeyPressed = value;
    }

    public final EventHandler<? super KeyEvent> getOnKeyPressed() {
        return onKeyPressed;
    }

    /** The code to run when a key is released in this scene's window. */
    public final void setOnKeyReleased(EventHandler<? super KeyEvent> value) {
        onKeyReleased = value;
    }

    public final EventHandler<? super KeyEvent> getOnKeyReleased() {
        return onKeyReleased;
    }

    /** The code to run when a key that makes a character (a letter, a digit, Space) is typed in this scene's window. */
    public final void setOnKeyTyped(EventHandler<? super KeyEvent> value) {
        onKeyTyped = value;
    }

    public final EventHandler<? super KeyEvent> getOnKeyTyped() {
        return onKeyTyped;
    }

    /** The width given to the constructor (or taken from the root pane when the window showed), or 0. */
    public final double getWidth() {
        double[] size = Session.sceneSize(this);
        return size == null ? 0 : size[0];
    }

    /** The height given to the constructor (or taken from the root pane when the window showed), or 0. */
    public final double getHeight() {
        double[] size = Session.sceneSize(this);
        return size == null ? 0 : size[1];
    }
}
