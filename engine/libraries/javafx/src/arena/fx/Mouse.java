// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.List;
import javafx.event.EventHandler;
import javafx.event.EventType;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.input.MouseEvent;
import javafx.stage.Window;

/**
 * The mouse during a session: press, drag, release and click at a point, as JavaFX 21 delivers
 * them to a node (checked against OpenJFX 21.0.12 with its Robot, without a screen). The events go
 * to the node the line names (Java Arena doesn't lay windows out, so it can't find the node under a
 * point), and only to a canvas or an image view, whose size it knows: a press must be on it (inside
 * the canvas; on a pixel of the image view's image that isn't fully transparent, as JavaFX picks
 * an image view), while the drags and the release go to the node where the mouse was pressed
 * wherever they are. The order is JavaFX's:
 *
 * <ul>
 * <li>press: MOUSE_PRESSED.</li>
 * <li>drag: MOUSE_DRAGGED (none when the mouse is already at that point: it didn't move).</li>
 * <li>release: a MOUSE_DRAGGED first if the point isn't where the mouse is, then MOUSE_RELEASED,
 * then MOUSE_CLICKED when the release is on the node (also after a drag, as in JavaFX, whose click
 * needs only the press and the release on the same node), unless the release's handler threw.</li>
 * <li>click at: a press, the Platform.runLater tasks it queued, then a release at the same point.</li>
 * </ul>
 */
final class Mouse {
    /** The node the mouse was pressed on (until it is released), or null. */
    private Node pressed;
    private double atX;
    private double atY;

    String apply(EventLine event, Node node, String kind, List<Window> windows) {
        if (!(node instanceof Canvas || node instanceof ImageView)) {
            return "the mouse events with a point go to a canvas or an image view, not to " + Outline.withArticle(kind) + " (Java Arena doesn't lay the other nodes out, so it can't tell where a point is on them)";
        }
        double x = Double.parseDouble(event.x);
        double y = Double.parseDouble(event.y);
        String where = "(" + event.x + ", " + event.y + ")";
        switch (event.command) {
            case "press":
            case "click": {
                String problem = canPress(node, kind, x, y, where, event.command.equals("click") ? "clicked" : "pressed");
                if (problem != null) {
                    return problem;
                }
                press(node, x, y);
                if (event.command.equals("press")) {
                    return null;
                }
                // The press and the release are two events: the tasks the press queued run between them.
                Session.drain();
                if (Session.exitRequested() || !showing(node)) {
                    pressed = null;
                    return null;
                }
                release(node, x, y);
                return null;
            }
            default: {
                if (pressed == null) {
                    return "the mouse isn't pressed: press it first, such as press " + Outline.typeName(node) + " 1 at 10 20";
                }
                if (pressed != node) {
                    return "the mouse is pressed on another node: " + event.command + " it on the " + Outline.noun(Outline.typeName(pressed)) + " it was pressed on";
                }
                if (event.command.equals("drag")) {
                    drag(node, x, y);
                } else {
                    release(node, x, y);
                }
                return null;
            }
        }
    }

    private String canPress(Node node, String kind, double x, double y, String where, String verb) {
        String hidden = Targets.hidden(node, kind, verb);
        if (hidden != null) {
            return hidden;
        }
        if (node.isDisabled()) {
            return (node.isDisable() ? "the " + kind + " is disabled" : "the " + kind + " is in a disabled pane") + " (setDisable(true)), so it can't be " + verb;
        }
        if (pressed != null) {
            return "the mouse is already pressed: release it first, such as release " + Outline.typeName(pressed) + " 1 at " + Numbers.plain(atX) + " " + Numbers.plain(atY);
        }
        if (node instanceof Canvas) {
            Canvas c = (Canvas) node;
            if (!on(node, x, y)) {
                return where + " isn't on the canvas, which is " + Numbers.plain(c.getWidth()) + " x " + Numbers.plain(c.getHeight());
            }
            return null;
        }
        Image image = ((ImageView) node).getImage();
        if (image == null) {
            return where + " isn't on the image view: it has no image";
        }
        if (image.isError()) {
            return where + " isn't on the image view: its image couldn't be read";
        }
        if (x < 0 || y < 0 || x >= image.getWidth() || y >= image.getHeight()) {
            return where + " isn't on the image view, whose image is " + Numbers.plain(image.getWidth()) + " x " + Numbers.plain(image.getHeight());
        }
        if (!on(node, x, y)) {
            return "the image view's image is transparent at " + where + ", so the mouse goes through it";
        }
        return null;
    }

    /** Whether the point is on the node, as JavaFX picks it. */
    private static boolean on(Node node, double x, double y) {
        if (node instanceof Canvas) {
            Canvas c = (Canvas) node;
            return c.getWidth() > 0 && c.getHeight() > 0 && x >= 0 && y >= 0 && x < c.getWidth() && y < c.getHeight();
        }
        Image image = ((ImageView) node).getImage();
        if (image == null || image.isError() || x < 0 || y < 0 || x >= image.getWidth() || y >= image.getHeight()) {
            return false;
        }
        return (image.getPixelReader().getArgb((int) x, (int) y) >>> 24) != 0;
    }

    private static boolean showing(Node node) {
        Scene scene = node.getScene();
        Window w = scene == null ? null : Session.windowOf(scene);
        return w != null && w.isShowing();
    }

    private void press(Node node, double x, double y) {
        pressed = node;
        atX = x;
        atY = y;
        fire(node, node.getOnMousePressed(), MouseEvent.MOUSE_PRESSED, x, y);
    }

    private void drag(Node node, double x, double y) {
        if (x == atX && y == atY) {
            return;
        }
        atX = x;
        atY = y;
        fire(node, node.getOnMouseDragged(), MouseEvent.MOUSE_DRAGGED, x, y);
    }

    private void release(Node node, double x, double y) {
        drag(node, x, y);
        pressed = null;
        if (!fire(node, node.getOnMouseReleased(), MouseEvent.MOUSE_RELEASED, x, y)) {
            return;
        }
        if (on(node, x, y)) {
            fire(node, node.getOnMouseClicked(), MouseEvent.MOUSE_CLICKED, x, y);
        }
    }

    /** Calls the handler, if any; an exception goes to the uncaught exception handler. Whether it returned normally. */
    private static boolean fire(Node node, EventHandler<? super MouseEvent> handler, EventType<MouseEvent> type, double x, double y) {
        if (handler == null) {
            return true;
        }
        try {
            handler.handle(MouseEvents.create(node, type, x, y));
            return true;
        } catch (Throwable t) {
            Session.uncaught(t);
            return false;
        }
    }
}
