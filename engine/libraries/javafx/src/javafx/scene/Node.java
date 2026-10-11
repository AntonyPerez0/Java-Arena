// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene;

import arena.fx.Frames;
import arena.fx.Geometry;
import arena.fx.Outline;
import javafx.event.EventHandler;
import javafx.geometry.Bounds;
import javafx.scene.input.KeyEvent;
import javafx.scene.input.MouseEvent;

/** Anything in a scene: a button, a label, a text field, or a pane that holds other nodes. */
public abstract class Node {
    static {
        arena.fx.NodeData.register(new arena.fx.NodeData.Access() {
            @Override
            public Object get(Node node) {
                return node.arenaData;
            }

            @Override
            public void set(Node node, Object data) {
                node.arenaData = data;
            }
        });
    }

    /** The library's own data about this node (arena.fx.NodeData). */
    private Object arenaData;
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
    private EventHandler<? super KeyEvent> onKeyPressed;
    private EventHandler<? super KeyEvent> onKeyReleased;
    private EventHandler<? super KeyEvent> onKeyTyped;
    private double translateX;
    private double translateY;
    private double layoutX;
    private double layoutY;
    private double rotate;

    protected Node() {
    }

    /** Moves the node right by this much from where its layout puts it. */
    public final void setTranslateX(double value) {
        translateX = value;
        Frames.touch(this, Frames.TRANSLATE_X);
    }

    public final double getTranslateX() {
        return translateX;
    }

    /** Moves the node down by this much from where its layout puts it. */
    public final void setTranslateY(double value) {
        translateY = value;
        Frames.touch(this, Frames.TRANSLATE_Y);
    }

    public final double getTranslateY() {
        return translateY;
    }

    /** Where the node's layout puts it (a Pane leaves it as set; Java Arena's other panes don't change it either). */
    public final void setLayoutX(double value) {
        layoutX = value;
        Frames.touch(this, Frames.LAYOUT_X);
    }

    public final double getLayoutX() {
        return layoutX;
    }

    public final void setLayoutY(double value) {
        layoutY = value;
        Frames.touch(this, Frames.LAYOUT_Y);
    }

    public final double getLayoutY() {
        return layoutY;
    }

    /** Turns the node by this many degrees, clockwise on the screen, about the center of its own bounds. */
    public final void setRotate(double value) {
        rotate = value;
        Frames.touch(this, Frames.ROTATE);
    }

    public final double getRotate() {
        return rotate;
    }

    /**
     * The box around the node in its own coordinates (before its translate, layout and rotate), as
     * JavaFX computes it for shapes. For other nodes Java Arena doesn't lay windows out, so it is
     * an estimate: a pane's preferred size (or 0) with its children, a canvas's size.
     */
    public final Bounds getBoundsInLocal() {
        return Geometry.boundsInLocal(this);
    }

    /** The box around the node where its layout, translate and rotate put it in its parent. */
    public final Bounds getBoundsInParent() {
        return Geometry.boundsInParent(this);
    }

    /**
     * The code to run when a key is pressed while this node has the focus. In Java Arena no node
     * has the focus, so key events go to the scene (Scene.setOnKeyPressed) and this never runs.
     */
    public final void setOnKeyPressed(EventHandler<? super KeyEvent> value) {
        onKeyPressed = value;
    }

    public final EventHandler<? super KeyEvent> getOnKeyPressed() {
        return onKeyPressed;
    }

    /** Stored: in Java Arena key events go to the scene (Scene.setOnKeyReleased). */
    public final void setOnKeyReleased(EventHandler<? super KeyEvent> value) {
        onKeyReleased = value;
    }

    public final EventHandler<? super KeyEvent> getOnKeyReleased() {
        return onKeyReleased;
    }

    /** Stored: in Java Arena key events go to the scene (Scene.setOnKeyTyped). */
    public final void setOnKeyTyped(EventHandler<? super KeyEvent> value) {
        onKeyTyped = value;
    }

    public final EventHandler<? super KeyEvent> getOnKeyTyped() {
        return onKeyTyped;
    }

    /**
     * No node gets the focus in Java Arena: key events go to the scene. The node is remembered, so
     * that a key line can say when real JavaFX would run this node's own key handlers first.
     */
    public void requestFocus() {
        arena.fx.Keys.focusRequested(this);
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
        Frames.touch(this, Frames.VISIBLE);
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
