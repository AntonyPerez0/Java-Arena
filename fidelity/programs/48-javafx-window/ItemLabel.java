import javafx.scene.control.Label;

/** A label of the program's own: the window JSON calls it a Label. */
public class ItemLabel extends Label {
    public ItemLabel(String text, int number) {
        super(number + ". " + text);
        setPadding(new javafx.geometry.Insets(2, 4, 2, 4));
    }
}
