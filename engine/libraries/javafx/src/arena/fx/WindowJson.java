// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.List;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.ButtonBase;
import javafx.scene.control.Labeled;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputControl;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.stage.Stage;
import javafx.stage.Window;

/**
 * The windows as JSON, for the page and the grader:
 *
 * <pre>
 * {"windows":[{"title":"Counter","width":300.0,"height":200.0,"scene":{"width":300.0,"height":200.0,"root":NODE}}],"problems":[]}
 * </pre>
 *
 * Keys are always in the same order and there are no spaces, so the JDK and the browser engine
 * write the same bytes. Numbers are written as Java prints doubles (10.0); NaN and the infinities,
 * which JSON has no numbers for, as the strings "NaN", "Infinity" and "-Infinity". Text is ASCII:
 * every other character is a \\u escape. A window's title is null when it has none; its width and
 * height are written only when setWidth and setHeight set them, a scene's only when its
 * constructor was given them. "closed":true (with no windows) means the session ended by close,
 * Platform.exit() or closing the last window.
 *
 * <p>A NODE is {"n":1,"type":"VBox",...}: n numbers the nodes of all windows in outline order
 * from 1 (see Outline); type is the nearest class of Java Arena's JavaFX. Then, in this order and
 * only when they differ from the default: for a GridPane's child "column", "row" (always) and
 * "columnSpan", "rowSpan" (above 1); "id"; "text" (labels, buttons and text inputs: always);
 * "promptText"; "disable" (the node's own flag); "visible" (false); "editable" (false); "wrapText"
 * (true); "font" ({"family":..,"size":..}, when not Font.getDefault()); "style"; "prefWidth";
 * "prefHeight"; "padding" ([top,right,bottom,left]); "spacing" (HBox, VBox); "hgap", "vgap"
 * (FlowPane, GridPane); "alignment" (when not TOP_LEFT, or CENTER for a StackPane); "onAction"
 * (true when a button or text field has a handler). Last come the children: "children":[...]
 * for panes, and "top", "left", "center", "right", "bottom" for a BorderPane.
 */
final class WindowJson {
    private final StringBuilder out = new StringBuilder();
    private int count;

    private WindowJson() {
    }

    static String write(List<Window> windows, boolean closed, List<String> problems) {
        WindowJson json = new WindowJson();
        StringBuilder out = json.out;
        out.append("{\"windows\":[");
        for (int i = 0; i < windows.size(); i++) {
            if (i > 0) {
                out.append(',');
            }
            json.window(windows.get(i));
        }
        out.append(']');
        if (closed) {
            out.append(",\"closed\":true");
        }
        out.append(",\"problems\":[");
        for (int i = 0; i < problems.size(); i++) {
            if (i > 0) {
                out.append(',');
            }
            json.string(problems.get(i));
        }
        out.append("]}");
        return out.toString();
    }

    private void window(Window w) {
        out.append("{\"title\":");
        string(w instanceof Stage ? ((Stage) w).getTitle() : null);
        if (!Double.isNaN(w.getWidth())) {
            key("width");
            number(w.getWidth());
        }
        if (!Double.isNaN(w.getHeight())) {
            key("height");
            number(w.getHeight());
        }
        key("scene");
        Scene scene = w.getScene();
        if (scene == null) {
            out.append("null");
        } else {
            out.append('{');
            double[] size = Session.sceneSize(scene);
            if (size != null) {
                out.append("\"width\":");
                number(size[0]);
                key("height");
                number(size[1]);
                out.append(',');
            }
            out.append("\"root\":");
            node(scene.getRoot(), null);
            out.append('}');
        }
        out.append('}');
    }

    private void node(Node node, GridPane grid) {
        out.append("{\"n\":").append(++count);
        key("type");
        string(Outline.typeName(node));
        if (grid != null) {
            Integer[] cell = GridCells.get(node);
            key("column").append(Outline.orZero(cell[0]));
            key("row").append(Outline.orZero(cell[1]));
            if (cell[2] != null && cell[2] > 1) {
                key("columnSpan").append(cell[2]);
            }
            if (cell[3] != null && cell[3] > 1) {
                key("rowSpan").append(cell[3]);
            }
        }
        String id = node.getId();
        if (id != null && !id.isEmpty()) {
            key("id");
            string(id);
        }
        if (Outline.hasText(node)) {
            key("text");
            string(Outline.textOf(node));
        }
        if (node instanceof TextInputControl) {
            String prompt = ((TextInputControl) node).getPromptText();
            if (prompt != null && !prompt.isEmpty()) {
                key("promptText");
                string(prompt);
            }
        }
        if (node.isDisable()) {
            key("disable").append("true");
        }
        if (!node.isVisible()) {
            key("visible").append("false");
        }
        if (node instanceof TextInputControl && !((TextInputControl) node).isEditable()) {
            key("editable").append("false");
        }
        if ((node instanceof Labeled && ((Labeled) node).isWrapText()) || (node instanceof TextArea && ((TextArea) node).isWrapText())) {
            key("wrapText").append("true");
        }
        Font font = node instanceof Labeled ? ((Labeled) node).getFont() : node instanceof TextInputControl ? ((TextInputControl) node).getFont() : Font.getDefault();
        if (font == null) {
            key("font").append("null");
        } else if (!font.equals(Font.getDefault())) {
            key("font").append("{\"family\":");
            string(font.getFamily());
            key("size");
            number(font.getSize());
            out.append('}');
        }
        if (!node.getStyle().isEmpty()) {
            key("style");
            string(node.getStyle());
        }
        if (node instanceof Region) {
            Region r = (Region) node;
            if (r.getPrefWidth() != Region.USE_COMPUTED_SIZE) {
                key("prefWidth");
                number(r.getPrefWidth());
            }
            if (r.getPrefHeight() != Region.USE_COMPUTED_SIZE) {
                key("prefHeight");
                number(r.getPrefHeight());
            }
            Insets p = r.getPadding();
            if (p.getTop() != 0 || p.getRight() != 0 || p.getBottom() != 0 || p.getLeft() != 0) {
                key("padding").append('[');
                number(p.getTop());
                out.append(',');
                number(p.getRight());
                out.append(',');
                number(p.getBottom());
                out.append(',');
                number(p.getLeft());
                out.append(']');
            }
        }
        double spacing = node instanceof HBox ? ((HBox) node).getSpacing() : node instanceof VBox ? ((VBox) node).getSpacing() : 0;
        if (spacing != 0) {
            key("spacing");
            number(spacing);
        }
        double hgap = node instanceof FlowPane ? ((FlowPane) node).getHgap() : node instanceof GridPane ? ((GridPane) node).getHgap() : 0;
        double vgap = node instanceof FlowPane ? ((FlowPane) node).getVgap() : node instanceof GridPane ? ((GridPane) node).getVgap() : 0;
        if (hgap != 0) {
            key("hgap");
            number(hgap);
        }
        if (vgap != 0) {
            key("vgap");
            number(vgap);
        }
        boolean aligned = node instanceof HBox || node instanceof VBox || node instanceof FlowPane || node instanceof GridPane || node instanceof StackPane;
        if (aligned) {
            Pos alignment = node instanceof HBox ? ((HBox) node).getAlignment()
                    : node instanceof VBox ? ((VBox) node).getAlignment()
                    : node instanceof FlowPane ? ((FlowPane) node).getAlignment()
                    : node instanceof GridPane ? ((GridPane) node).getAlignment()
                    : ((StackPane) node).getAlignment();
            Pos usual = node instanceof StackPane ? Pos.CENTER : Pos.TOP_LEFT;
            if (alignment != usual) {
                key("alignment");
                string(alignment == null ? null : alignment.name());
            }
        }
        EventHandler<ActionEvent> onAction = node instanceof ButtonBase ? ((ButtonBase) node).getOnAction() : node instanceof TextField ? ((TextField) node).getOnAction() : null;
        if (onAction != null) {
            key("onAction").append("true");
        }
        if (node instanceof BorderPane) {
            BorderPane b = (BorderPane) node;
            region("top", b.getTop());
            region("left", b.getLeft());
            region("center", b.getCenter());
            region("right", b.getRight());
            region("bottom", b.getBottom());
        } else if (node instanceof Pane) {
            key("children").append('[');
            List<Node> children = Outline.children(node);
            for (int i = 0; i < children.size(); i++) {
                if (i > 0) {
                    out.append(',');
                }
                node(children.get(i), node instanceof GridPane ? (GridPane) node : null);
            }
            out.append(']');
        }
        out.append('}');
    }

    private void region(String name, Node child) {
        if (child != null) {
            key(name);
            node(child, null);
        }
    }

    private StringBuilder key(String name) {
        out.append(",\"").append(name).append("\":");
        return out;
    }

    /** Writes the number as Java prints a double; NaN and the infinities as strings. */
    private void number(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            out.append('"').append(Double.toString(value)).append('"');
        } else {
            out.append(Double.toString(value));
        }
    }

    /** A JSON string of ASCII characters only (others as \\u escapes), or null. */
    private void string(String s) {
        if (s == null) {
            out.append("null");
            return;
        }
        out.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':
                    out.append("\\\"");
                    break;
                case '\\':
                    out.append("\\\\");
                    break;
                case '\n':
                    out.append("\\n");
                    break;
                case '\r':
                    out.append("\\r");
                    break;
                case '\t':
                    out.append("\\t");
                    break;
                case '\b':
                    out.append("\\b");
                    break;
                case '\f':
                    out.append("\\f");
                    break;
                default:
                    if (c < 0x20 || c >= 0x7F) {
                        String hex = Integer.toHexString(c);
                        out.append("\\u");
                        for (int k = hex.length(); k < 4; k++) {
                            out.append('0');
                        }
                        out.append(hex);
                    } else {
                        out.append(c);
                    }
            }
        }
        out.append('"');
    }
}
