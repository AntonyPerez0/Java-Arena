// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.stage;

import arena.fx.Session;
import javafx.scene.Scene;

/** A window with a title. launch creates the first one and passes it to start; a program can make more. */
public class Stage extends Window {
    private String title;
    private boolean resizable = true;

    /** A new window, not shown yet. Must be made on the JavaFX Application Thread (in start or in a handler). */
    public Stage() {
        Session.checkFxThread();
    }

    public final void setTitle(String value) {
        title = value;
    }

    public final String getTitle() {
        return title;
    }

    @Override
    public final void setScene(Scene value) {
        super.setScene(value);
    }

    @Override
    public final void show() {
        super.show();
    }

    /** Closes the window (the same as hide()). */
    public final void close() {
        hide();
    }

    public final void setResizable(boolean value) {
        resizable = value;
    }

    public final boolean isResizable() {
        return resizable;
    }
}
