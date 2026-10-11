// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.List;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.chart.Axis;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.control.ButtonBase;
import javafx.scene.control.Slider;
import javafx.scene.control.Labeled;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputControl;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.paint.Paint;
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
 * (true when a button or text field has a handler). A node other than a canvas or an image view
 * then has "onMousePressed", "onMouseDragged", "onMouseReleased", "onMouseClicked" (true when set):
 * such a handler never runs in Java Arena (the mouse events go only to a canvas or an image view),
 * and the page says so. Then, for the kinds of node of part 14:
 *
 * <ul>
 * <li>Canvas: "width", "height", "onMousePressed", "onMouseDragged", "onMouseReleased",
 * "onMouseClicked" (true when set), "calls":[CALL...] (the first Drawing.KEPT, 5000, drawing calls, in order) and
 * "callCount" (all of them, only when there were more). A CALL is {"op":"fillRect","args":[x,y,w,h],
 * "fill":"#rrggbb"}: "text" for fillText and strokeText, "args" (x, y, w, h; x1, y1, x2, y2 for
 * strokeLine; x, y for a text) or "xs" and "ys" for a polygon, then the state it used: "fill", or
 * "stroke" and "lineWidth", and "font" ({"family":..,"size":..}, with "style" when it isn't Regular:
 * "Bold", "Italic" or "Bold Italic") for a text. A color is #rrggbb,
 * or #rrggbbaa when it isn't opaque.</li>
 * <li>ImageView: the mouse handlers, then "image": null (none), {"error":"the exception"}, or
 * {"width":..,"height":..,"crc":"8 hex digits","pixels":"base64"}: the CRC-32 of the ARGB values row
 * by row (each as 4 bytes, A first) and, for an image up to 512 x 512, its RGBA bytes.</li>
 * <li>Slider: "min", "max", "value", "majorTickUnit", "minorTickCount", "blockIncrement", and
 * "showTickLabels", "showTickMarks", "snapToTicks" when true.</li>
 * <li>LineChart, BarChart, ScatterChart: "title" (null for none), "legendVisible":false,
 * "createSymbols":false (a line chart), "xAxis" and "yAxis" ({"type":"NumberAxis","label":..,
 * "autoRanging":..,"lowerBound":..,"upperBound":..,"tickUnit":..,"forceZeroInRange":..,
 * "minorTickVisible":..} or {"type":"CategoryAxis","label":..,"autoRanging":..,"categories":[..]}),
 * and "series":[{"name":..,"data":[[x,y]...]}...]: a value is a number (whole numbers as they are),
 * a text, or null.</li>
 * </ul>
 *
 * Last come the children: "children":[...] for panes, and "top", "left", "center", "right",
 * "bottom" for a BorderPane.
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
        if (node instanceof Canvas) {
            canvas((Canvas) node);
        } else if (node instanceof ImageView) {
            imageView((ImageView) node);
        } else {
            // On another node a mouse handler never runs here (the mouse events go only to a
            // canvas or an image view): written so the page can say so.
            mouseHandlers(node);
            if (node instanceof Slider) {
                slider((Slider) node);
            } else if (node instanceof XYChart) {
                chart((XYChart<?, ?>) node);
            }
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

    // ------------------------------------------------------------------ canvas, image view, slider, charts

    private void mouseHandlers(Node node) {
        if (node.getOnMousePressed() != null) {
            key("onMousePressed").append("true");
        }
        if (node.getOnMouseDragged() != null) {
            key("onMouseDragged").append("true");
        }
        if (node.getOnMouseReleased() != null) {
            key("onMouseReleased").append("true");
        }
        if (node.getOnMouseClicked() != null) {
            key("onMouseClicked").append("true");
        }
    }

    private void canvas(Canvas canvas) {
        key("width");
        number(canvas.getWidth());
        key("height");
        number(canvas.getHeight());
        mouseHandlers(canvas);
        Drawing drawing = Drawing.of(canvas);
        List<Drawing.Call> calls = drawing.calls();
        key("calls").append('[');
        for (int i = 0; i < calls.size(); i++) {
            if (i > 0) {
                out.append(',');
            }
            call(calls.get(i));
        }
        out.append(']');
        if (drawing.count() > calls.size()) {
            key("callCount").append(drawing.count());
        }
    }

    /** The last paint a call used and its color, as most calls use the paint of the call before. */
    private Paint lastPaint;
    private String lastColor;

    /**
     * One drawing call. The name and the color are ASCII without quotes or backslashes (a method
     * name; #rrggbb or #rrggbbaa), so they are appended as they are: the browser's interpreter is
     * slow at going through a string character by character, and a canvas has up to Drawing.KEPT
     * calls. The text and the font's family are the program's own, so they are escaped.
     */
    private void call(Drawing.Call c) {
        out.append("{\"op\":\"").append(c.op).append('"');
        if (c.text != null) {
            key("text");
            string(c.text);
        }
        if (c.args != null) {
            key("args");
            numbers(c.args);
        }
        if (c.xs != null) {
            key("xs");
            numbers(c.xs);
            key("ys");
            numbers(c.ys);
        }
        if (c.paint != null) {
            if (c.paint != lastPaint) {
                lastPaint = c.paint;
                lastColor = color(c.paint);
            }
            out.append(c.isStroke() ? ",\"stroke\":\"" : ",\"fill\":\"").append(lastColor).append('"');
            if (c.isStroke()) {
                key("lineWidth");
                number(c.lineWidth);
            }
        }
        if (c.font != null) {
            key("font").append("{\"family\":");
            string(c.font.getFamily());
            key("size");
            number(c.font.getSize());
            // Bold, Italic or Bold Italic (from a full name, new Font("Serif Bold", 18)): written so
            // the text is drawn in it. Not in the outline, which gives a font's family and size.
            String style = c.font.getStyle();
            if (style != null && !style.equals("Regular")) {
                key("style");
                string(style);
            }
            out.append('}');
        }
        out.append('}');
    }

    private void numbers(double[] values) {
        out.append('[');
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                out.append(',');
            }
            number(values[i]);
        }
        out.append(']');
    }

    /** A color as #rrggbb, or #rrggbbaa when it isn't opaque (each byte rounded as Color.toString rounds it). */
    static String color(Paint paint) {
        Color c = (Color) paint;
        int a = (int) Math.round(c.getOpacity() * 255.0);
        StringBuilder s = new StringBuilder(9).append('#');
        hex(s, (int) Math.round(c.getRed() * 255.0));
        hex(s, (int) Math.round(c.getGreen() * 255.0));
        hex(s, (int) Math.round(c.getBlue() * 255.0));
        if (a != 255) {
            hex(s, a);
        }
        return s.toString();
    }

    /** A byte (0 to 255) as two lowercase hex digits. */
    private static void hex(StringBuilder s, int b) {
        s.append(Character.forDigit((b >> 4) & 15, 16)).append(Character.forDigit(b & 15, 16));
    }

    /** An image view's image: null (none), {"error":...} or its size, CRC and (up to 512 x 512) pixels. */
    private void imageView(ImageView view) {
        mouseHandlers(view);
        key("image");
        Image image = view.getImage();
        if (image == null) {
            out.append("null");
            return;
        }
        if (image.isError()) {
            out.append("{\"error\":");
            string(String.valueOf(image.getException()));
            out.append('}');
            return;
        }
        Images.Loaded data = Images.of(image);
        out.append("{\"width\":");
        number(data.width);
        key("height");
        number(data.height);
        key("crc");
        string(Pixels.crc(data.argb));
        if (data.width <= 512 && data.height <= 512) {
            // Base64 is ASCII letters, digits, +, / and =, which need no escaping: appended as it is
            // (escaping it a character at a time took seconds in the browser for a big image).
            key("pixels").append('"').append(Pixels.rgbaBase64(data.argb)).append('"');
        }
        out.append('}');
    }

    private void slider(Slider slider) {
        key("min");
        number(slider.getMin());
        key("max");
        number(slider.getMax());
        key("value");
        number(slider.getValue());
        key("majorTickUnit");
        number(slider.getMajorTickUnit());
        key("minorTickCount").append(slider.getMinorTickCount());
        key("blockIncrement");
        number(slider.getBlockIncrement());
        if (slider.isShowTickLabels()) {
            key("showTickLabels").append("true");
        }
        if (slider.isShowTickMarks()) {
            key("showTickMarks").append("true");
        }
        if (slider.isSnapToTicks()) {
            key("snapToTicks").append("true");
        }
    }

    private void chart(XYChart<?, ?> chart) {
        key("title");
        string(chart.getTitle());
        if (!chart.isLegendVisible()) {
            key("legendVisible").append("false");
        }
        if (chart instanceof LineChart && !((LineChart<?, ?>) chart).getCreateSymbols()) {
            key("createSymbols").append("false");
        }
        key("xAxis");
        axis(chart.getXAxis());
        key("yAxis");
        axis(chart.getYAxis());
        key("series");
        if (chart.getData() == null) {
            out.append("null");
            return;
        }
        out.append('[');
        List<? extends XYChart.Series<?, ?>> all = chart.getData();
        for (int i = 0; i < all.size(); i++) {
            if (i > 0) {
                out.append(',');
            }
            XYChart.Series<?, ?> s = all.get(i);
            if (s == null) {
                out.append("null");
                continue;
            }
            out.append("{\"name\":");
            string(s.getName());
            key("data");
            if (s.getData() == null) {
                out.append("null");
            } else {
                out.append('[');
                List<? extends XYChart.Data<?, ?>> points = s.getData();
                for (int j = 0; j < points.size(); j++) {
                    if (j > 0) {
                        out.append(',');
                    }
                    XYChart.Data<?, ?> d = points.get(j);
                    if (d == null) {
                        out.append("null");
                    } else {
                        out.append('[');
                        value(d.getXValue());
                        out.append(',');
                        value(d.getYValue());
                        out.append(']');
                    }
                }
                out.append(']');
            }
            out.append('}');
        }
        out.append(']');
    }

    private void axis(Axis<?> axis) {
        out.append("{\"type\":");
        string(Outline.typeName(axis));
        key("label");
        string(axis.getLabel());
        key("autoRanging").append(axis.isAutoRanging());
        if (axis instanceof NumberAxis) {
            NumberAxis n = (NumberAxis) axis;
            key("lowerBound");
            number(n.getLowerBound());
            key("upperBound");
            number(n.getUpperBound());
            key("tickUnit");
            number(n.getTickUnit());
            key("forceZeroInRange").append(n.isForceZeroInRange());
            key("minorTickVisible").append(n.isMinorTickVisible());
        } else if (axis instanceof CategoryAxis) {
            key("categories").append('[');
            List<String> categories = ((CategoryAxis) axis).getCategories();
            for (int i = 0; i < categories.size(); i++) {
                if (i > 0) {
                    out.append(',');
                }
                string(categories.get(i));
            }
            out.append(']');
        }
        out.append('}');
    }

    /** A data point's value: a number as a JSON number (whole numbers as they are), a text as a string, anything else as its text. */
    private void value(Object v) {
        if (v == null) {
            out.append("null");
        } else if (v instanceof Integer || v instanceof Long || v instanceof Short || v instanceof Byte || v instanceof java.math.BigInteger) {
            out.append(v.toString());
        } else if (v instanceof Float && !((Float) v).isNaN() && !((Float) v).isInfinite()) {
            out.append(v.toString());
        } else if (v instanceof Number) {
            number(((Number) v).doubleValue());
        } else {
            string(String.valueOf(v));
        }
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

    /** The whole numbers 0 to 1023 as Java prints them as doubles ("12.0"), made when first needed. */
    private static final String[] WHOLE = new String[1024];

    /** Writes the number as Java prints a double; NaN and the infinities as strings. */
    private void number(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            out.append('"').append(Double.toString(value)).append('"');
        } else if (value == (int) value && (value != 0 || 1 / value > 0) && Math.abs(value) < 1e7) {
            // A whole number below 10^7 (not -0.0), which Double.toString writes as 12.0: written
            // directly, as Double.toString is slow in the browser's interpreter (and the small ones
            // that drawings use most from a table, in one append).
            int whole = (int) value;
            if (whole >= 0 && whole < WHOLE.length) {
                String text = WHOLE[whole];
                if (text == null) {
                    text = whole + ".0";
                    WHOLE[whole] = text;
                }
                out.append(text);
            } else {
                out.append(whole).append(".0");
            }
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
