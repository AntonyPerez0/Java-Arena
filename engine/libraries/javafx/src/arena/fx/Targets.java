// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.List;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.scene.Node;
import javafx.scene.canvas.Canvas;
import javafx.scene.control.ButtonBase;
import javafx.scene.control.Slider;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputControl;
import javafx.scene.image.ImageView;
import javafx.stage.Stage;
import javafx.stage.Window;

/**
 * Finds what an event acts on, in the windows of the moment, and does what the user would have
 * done: fire() for a click, appendText for each typed character, setText for set, the text field's
 * onAction handler for Enter, close() for close, the slider's thumb let go at a value for set with
 * a number, and the mouse events JavaFX fires for press, drag, release and click at a point (see
 * Mouse). Returns why the event couldn't happen (in plain English, for the learner), or null.
 */
final class Targets {
    private Targets() {
    }

    static String apply(EventLine event, List<Window> windows, Window primary, Mouse mouse) {
        if (event.command.equals("close")) {
            if (primary == null || !primary.isShowing()) {
                return "the main window isn't open";
            }
            ((Stage) primary).close();
            return null;
        }
        if (windows.isEmpty()) {
            return "no window is open";
        }
        List<Node> nodes = Outline.nodes(windows);
        Target t = event.target;
        Node node = null;
        if (t.number > 0) {
            if (t.number > nodes.size()) {
                return "there's no node #" + t.number + " (the open " + (windows.size() == 1 ? "window has " : "windows have ") + nodes.size() + ")";
            }
            node = nodes.get(t.number - 1);
        } else if (t.id != null) {
            for (Node n : nodes) {
                if (t.id.equals(n.getId())) {
                    node = n;
                    break;
                }
            }
            if (node == null) {
                return "there's no node with the id \"" + t.id + "\"";
            }
        } else if (t.text != null) {
            for (Node n : nodes) {
                if (Outline.isA(n, t.type) && Outline.hasText(n) && t.text.equals(Outline.textOf(n))) {
                    node = n;
                    break;
                }
            }
            if (node == null) {
                return "there's no " + Outline.noun(t.type) + " with the text " + quoted(t.text);
            }
        } else {
            int count = 0;
            for (Node n : nodes) {
                if (Outline.isA(n, t.type)) {
                    count++;
                    if (count == t.index) {
                        node = n;
                    }
                }
            }
            if (node == null) {
                return count == 0 ? "there's no " + Outline.noun(t.type) : count == 1 ? "there's only 1 " + Outline.noun(t.type) : "there are only " + count + " " + Outline.plural(t.type);
            }
        }
        String kind = Outline.noun(Outline.typeName(node));
        String command = event.command;
        if (event.x != null) {
            return mouse.apply(event, node, kind, windows);
        }
        if (command.equals("click")) {
            if (node instanceof Canvas || node instanceof ImageView) {
                return Outline.withArticle(kind) + " isn't clicked like a button: give the point, such as click " + Outline.typeName(node) + " 1 at 10 20";
            }
            if (!(node instanceof ButtonBase)) {
                return Outline.withArticle(kind) + " can't be clicked (only buttons can)";
            }
            String hidden = hidden(node, kind, "clicked");
            if (hidden != null) {
                return hidden;
            }
            // A disabled button does nothing when clicked, as in JavaFX.
            ((ButtonBase) node).fire();
            return null;
        }
        if (command.equals("enter")) {
            if (!(node instanceof TextField)) {
                return "Enter can be pressed only in a text field, not in " + Outline.withArticle(kind);
            }
            String hidden = hidden(node, kind, "used");
            if (hidden != null) {
                return hidden;
            }
            TextField field = (TextField) node;
            EventHandler<ActionEvent> handler = field.getOnAction();
            if (!field.isDisabled() && handler != null) {
                handler.handle(Actions.create(field));
            }
            return null;
        }
        // type and set
        if (node instanceof Slider) {
            if (event.number == null) {
                return command.equals("set") ? "a slider is set to a number, not a text, such as set Slider 1 25" : "you can't type in a slider (set Slider 1 25 moves it)";
            }
            return slide((Slider) node, event.number);
        }
        if (event.number != null) {
            return node instanceof TextInputControl ? "the text for " + Outline.withArticle(kind) + " goes in double quotes, such as set " + Outline.typeName(node) + " 1 \"" + event.number + "\"" : "only a slider is set to a number, not " + Outline.withArticle(kind);
        }
        if (!(node instanceof TextInputControl)) {
            return "you can't type in " + Outline.withArticle(kind) + " (only in text fields and text areas)";
        }
        TextInputControl field = (TextInputControl) node;
        String hidden = hidden(node, kind, "typed in");
        if (hidden != null) {
            return hidden;
        }
        if (field.isDisabled()) {
            return (field.isDisable() ? "the " + kind + " is disabled" : "the " + kind + " is in a disabled pane") + " (setDisable(true)), so you can't type in it";
        }
        if (!field.isEditable()) {
            return "the " + kind + " isn't editable (setEditable(false)), so you can't type in it";
        }
        if (command.equals("set")) {
            field.setText(event.argument);
        } else {
            String text = event.argument;
            for (int i = 0; i < text.length(); ) {
                int end = i + Character.charCount(text.codePointAt(i));
                field.appendText(text.substring(i, end));
                i = end;
            }
        }
        return null;
    }

    /**
     * Moves a slider as letting its thumb go at this value does in JavaFX (Slider.adjustValue): the
     * value is kept between min and max, then, when the slider snaps to ticks, moved to the nearest
     * tick (a tick every majorTickUnit / (minorTickCount + 1), counted from min; halfway goes up),
     * then set once. A slider whose max isn't above its min doesn't move.
     */
    private static String slide(Slider slider, String number) {
        String hidden = hidden(slider, "slider", "moved");
        if (hidden != null) {
            return hidden;
        }
        if (slider.isDisabled()) {
            return (slider.isDisable() ? "the slider is disabled" : "the slider is in a disabled pane") + " (setDisable(true)), so it can't be moved";
        }
        double v = Double.parseDouble(number);
        double min = slider.getMin();
        double max = slider.getMax();
        if (v < min || v > max) {
            return "the slider goes from " + Numbers.plain(min) + " to " + Numbers.plain(max) + ", so it can't be moved to " + number;
        }
        if (max <= min) {
            return null;
        }
        if (slider.isSnapToTicks()) {
            int minor = slider.getMinorTickCount();
            double spacing = minor != 0 ? slider.getMajorTickUnit() / (Math.max(minor, 0) + 1) : slider.getMajorTickUnit();
            int below = (int) ((v - min) / spacing);
            double lower = below * spacing + min;
            double upper = (below + 1) * spacing + min;
            v = v - lower < upper - v ? lower : upper;
            v = v < min ? min : v > max ? max : v;
        }
        slider.setValue(v);
        return null;
    }

    /** Why the node can't be used because it, or a pane it is in, is hidden; or null. */
    static String hidden(Node node, String kind, String verb) {
        for (Node n = node; n != null; n = n.getParent()) {
            if (!n.isVisible()) {
                return (n == node ? "the " + kind + " is hidden" : "the " + kind + " is in a hidden pane") + " (setVisible(false)), so it can't be " + verb;
            }
        }
        return null;
    }

    static String quoted(String text) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"' || c == '\\') {
                sb.append('\\').append(c);
            } else if (c == '\n') {
                sb.append("\\n");
            } else if (c == '\t') {
                sb.append("\\t");
            } else {
                sb.append(c);
            }
        }
        return sb.append('"').toString();
    }
}
