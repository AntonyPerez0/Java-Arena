// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.Labeled;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputControl;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.Pane;
import javafx.stage.Window;

/**
 * The outline order of a window's nodes, which numbers them (n in the window JSON) and finds
 * event targets: depth first; a pane's children in their order, a BorderPane's regions as top,
 * left, center, right, bottom, and a GridPane's children by row, then column, then the order they
 * were added.
 */
public final class Outline {
    /** The node classes of Java Arena's JavaFX, by simple name. */
    private static final String[] TYPES = { "Node", "Parent", "Region", "Pane", "FlowPane", "HBox", "VBox", "StackPane", "BorderPane", "GridPane", "Control", "Labeled", "Label", "ButtonBase", "Button", "TextInputControl", "TextField", "PasswordField", "TextArea" };

    private Outline() {
    }

    static boolean known(String type) {
        for (String t : TYPES) {
            if (t.equals(type)) {
                return true;
            }
        }
        return false;
    }

    /** The simple name of the nearest class of Java Arena's JavaFX: a program's class MenuView extends VBox is a VBox. */
    static String typeName(Node node) {
        for (Class<?> c = node.getClass(); c != null; c = c.getSuperclass()) {
            String name = c.getName();
            if (name.startsWith("javafx.")) {
                return name.substring(name.lastIndexOf('.') + 1);
            }
        }
        return "Node";
    }

    /** Whether the node is of this JavaFX class (or of a class that extends it). */
    static boolean isA(Node node, String type) {
        for (Class<?> c = node.getClass(); c != null; c = c.getSuperclass()) {
            String name = c.getName();
            if (name.startsWith("javafx.") && name.substring(name.lastIndexOf('.') + 1).equals(type)) {
                return true;
            }
        }
        return false;
    }

    /** The class in plain words for messages: "button", "text field", or the class name for panes. */
    static String noun(String type) {
        switch (type) {
            case "Button":
            case "ButtonBase":
                return "button";
            case "Label":
                return "label";
            case "Labeled":
                return "label or button";
            case "TextField":
                return "text field";
            case "PasswordField":
                return "password field";
            case "TextArea":
                return "text area";
            case "TextInputControl":
                return "text field or text area";
            case "Control":
                return "control";
            case "Node":
                return "node";
            default:
                return type;
        }
    }

    static String plural(String type) {
        switch (type) {
            case "Labeled":
                return "labels or buttons";
            case "TextInputControl":
                return "text fields or text areas";
            case "HBox":
            case "VBox":
                return type + "es";
            default:
                return noun(type) + "s";
        }
    }

    /** "a button", "an HBox". */
    static String withArticle(String noun) {
        char c = noun.charAt(0);
        boolean an = "aeiouAEIOU".indexOf(c) >= 0 || noun.startsWith("HBox");
        return (an ? "an " : "a ") + noun;
    }

    static boolean hasText(Node node) {
        return node instanceof Labeled || node instanceof TextInputControl;
    }

    static String textOf(Node node) {
        if (node instanceof Labeled) {
            return ((Labeled) node).getText();
        }
        if (node instanceof TextInputControl) {
            return ((TextInputControl) node).getText();
        }
        return null;
    }

    /** The children of a node in outline order (empty for a control). */
    static List<Node> children(Node node) {
        List<Node> list = new ArrayList<Node>();
        if (node instanceof BorderPane) {
            BorderPane b = (BorderPane) node;
            Node[] regions = { b.getTop(), b.getLeft(), b.getCenter(), b.getRight(), b.getBottom() };
            for (Node r : regions) {
                if (r != null) {
                    list.add(r);
                }
            }
        } else if (node instanceof GridPane) {
            list.addAll(((GridPane) node).getChildren());
            Collections.sort(list, new Comparator<Node>() {
                @Override
                public int compare(Node a, Node b) {
                    Integer[] ca = GridCells.get(a);
                    Integer[] cb = GridCells.get(b);
                    int byRow = Integer.compare(orZero(ca[1]), orZero(cb[1]));
                    return byRow != 0 ? byRow : Integer.compare(orZero(ca[0]), orZero(cb[0]));
                }
            });
        } else if (node instanceof Pane) {
            list.addAll(((Pane) node).getChildren());
        }
        return list;
    }

    static int orZero(Integer value) {
        return value == null ? 0 : value;
    }

    /** Every node of the windows' scenes, numbered from 1 in this order. */
    static List<Node> nodes(List<Window> windows) {
        List<Node> all = new ArrayList<Node>();
        for (Window w : windows) {
            Scene scene = w.getScene();
            if (scene != null) {
                collect(scene.getRoot(), all);
            }
        }
        return all;
    }

    private static void collect(Node node, List<Node> out) {
        out.add(node);
        for (Node child : children(node)) {
            collect(child, out);
        }
    }

    /** The style classes JavaFX gives a node of this kind, for toString. */
    public static String styleClass(Node node) {
        if (node instanceof Button) {
            return "button";
        }
        if (node instanceof Label) {
            return "label";
        }
        if (node instanceof PasswordField) {
            return "text-input text-field password-field";
        }
        if (node instanceof TextField) {
            return "text-input text-field";
        }
        if (node instanceof TextArea) {
            return "text-input text-area";
        }
        return "";
    }
}
