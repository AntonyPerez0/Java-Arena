// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene;

import arena.fx.Outline;
import javafx.event.EventHandler;
import javafx.scene.input.MouseEvent;

/** Anything in a scene: a button, a label, a text field, or a pane that holds other nodes. */
public abstract class Node {
    private String id;
    private boolean disable;
    private boolean visible = true;
    private String style = "";
    /** The parent whose children list holds this node (kept by Parent). */
    Parent parent;
    /** The scene whose root this node is (kept by Scene). */
    Scene rootOf;
    private EventHandler<? super MouseEvent> onMousePressed;
    private EventHandler<? super MouseEvent> onMouseDragged;
    private EventHandler<? super MouseEvent> onMouseReleased;
    private EventHandler<? super MouseEvent> onMouseClicked;

    protected Node() {
    }

    /** The node's id, for lookup("#id"). */
    public final void setId(String value) {
        id = value;
    }

    public final String getId() {
        return id;
    }

    /** Disables the node (and everything in it): a disabled button can't be clicked. */
    public final void setDisable(boolean value) {
        disable = value;
    }

    /** Whether setDisable(true) was called on this node itself. */
    public final boolean isDisable() {
        return disable;
    }

    /** Whether this node or a pane it is in is disabled. */
    public final boolean isDisabled() {
        for (Node n = this; n != null; n = n.parent) {
            if (n.disable) {
                return true;
            }
        }
        return false;
    }

    public final void setVisible(boolean value) {
        visible = value;
    }

    public final boolean isVisible() {
        return visible;
    }

    /** The pane this node is in, or null. */
    public final Parent getParent() {
        return parent;
    }

    /** The scene this node is in, or null. */
    public final Scene getScene() {
        Node top = this;
        while (top.parent != null) {
            top = top.parent;
        }
        return top.rootOf;
    }

    /** CSS style text, such as "-fx-font-size: 20"; stored, and drawn approximately. */
    public final void setStyle(String value) {
        style = value;
    }

    public final String getStyle() {
        return style == null ? "" : style;
    }

    /** The code to run when the mouse is pressed on this node (in Java Arena, a canvas or an image view). */
    public final void setOnMousePressed(EventHandler<? super MouseEvent> value) {
        onMousePressed = value;
    }

    public final EventHandler<? super MouseEvent> getOnMousePressed() {
        return onMousePressed;
    }

    /** The code to run each time the mouse moves while it is pressed, after it was pressed on this node. */
    public final void setOnMouseDragged(EventHandler<? super MouseEvent> value) {
        onMouseDragged = value;
    }

    public final EventHandler<? super MouseEvent> getOnMouseDragged() {
        return onMouseDragged;
    }

    /** The code to run when the mouse is released, after it was pressed on this node. */
    public final void setOnMouseReleased(EventHandler<? super MouseEvent> value) {
        onMouseReleased = value;
    }

    public final EventHandler<? super MouseEvent> getOnMouseReleased() {
        return onMouseReleased;
    }

    /** The code to run when the mouse is pressed and released on this node (also after it moved in between). */
    public final void setOnMouseClicked(EventHandler<? super MouseEvent> value) {
        onMouseClicked = value;
    }

    public final EventHandler<? super MouseEvent> getOnMouseClicked() {
        return onMouseClicked;
    }

    /** This node when the selector is "#" followed by its id, otherwise null (only #id selectors are supported). */
    public Node lookup(String selector) {
        if (selector != null && selector.length() > 1 && selector.charAt(0) == '#' && id != null && id.equals(selector.substring(1))) {
            return this;
        }
        return null;
    }

    /** As JavaFX writes a node: its class, then its id or identity hash, then its style classes. */
    @Override
    public String toString() {
        String name = getClass().getName();
        StringBuilder sb = new StringBuilder(name.substring(name.lastIndexOf('.') + 1));
        boolean hasId = id != null && !id.isEmpty();
        String own = Outline.styleClass(this);
        String classes = rootOf != null ? (own.isEmpty() ? "root" : "root " + own) : own;
        if (hasId) {
            sb.append("[id=").append(id);
            if (classes.isEmpty()) {
                sb.append(']');
            }
        } else {
            sb.append('@').append(Integer.toHexString(hashCode()));
        }
        if (!classes.isEmpty()) {
            sb.append(hasId ? ", " : "[").append("styleClass=").append(classes).append(']');
        }
        return sb.toString();
    }
}
