// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.stage;

import arena.fx.Session;
import javafx.scene.Scene;

/**
 * A window on the screen. Its width and height are what setWidth and setHeight recorded (NaN
 * until then): Java Arena doesn't lay windows out.
 */
public class Window {
    private double width = Double.NaN;
    private double height = Double.NaN;
    private Scene scene;
    private boolean showing;

    protected Window() {
    }

    public final double getWidth() {
        return width;
    }

    public final void setWidth(double value) {
        width = value;
    }

    public final double getHeight() {
        return height;
    }

    public final void setHeight(double value) {
        height = value;
    }

    /** The scene the window shows, or null. */
    public final Scene getScene() {
        return scene;
    }

    /** Shows the scene in this window; a scene can be in one window at a time, so another window that had it loses it. */
    protected void setScene(Scene value) {
        Session.checkFxThread();
        if (value == scene) {
            return;
        }
        if (value != null) {
            Window other = Session.windowOf(value);
            if (other != null && other != this) {
                other.scene = null;
            }
        }
        if (scene != null) {
            Session.setWindowOf(scene, null);
        }
        scene = value;
        if (value != null) {
            Session.setWindowOf(value, this);
        }
    }

    public final boolean isShowing() {
        return showing;
    }

    protected void show() {
        Session.checkFxThread();
        if (!showing) {
            showing = true;
            Session.shown(this);
        }
    }

    /** Hides the window. Hiding the last window that shows ends the program's session, as closing it would. */
    public void hide() {
        Session.checkFxThread();
        if (showing) {
            showing = false;
            Session.hidden(this);
        }
    }
}
