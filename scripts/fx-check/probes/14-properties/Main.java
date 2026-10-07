// Probe: StringProperty, SimpleStringProperty and ChangeListener: listeners hear only real changes,
// in the order they were added, as often as they were added; removeListener; an exception in a
// listener; the text properties of controls. Listeners that change the value while the listeners
// hear of an earlier change (what the others hear then), that remove themselves first, and that
// are added during a change; a text field that keeps only digits and a label that shows its length.
import javafx.application.Application;
import javafx.beans.property.SimpleStringProperty;
import javafx.beans.property.StringProperty;
import javafx.beans.value.ChangeListener;
import javafx.beans.value.ObservableValue;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        StringProperty empty = new SimpleStringProperty();
        System.out.println("new SimpleStringProperty(): get " + empty.get() + ", getValue " + empty.getValue() + ", " + empty);
        SimpleStringProperty p = new SimpleStringProperty("start");
        ChangeListener<String> first = (obs, old, now) -> System.out.println("  first: " + old + " -> " + now + " (observable is p: " + (obs == p) + ")");
        ChangeListener<Object> any = (obs, old, now) -> System.out.println("  any: " + old + " -> " + now);
        p.addListener(first);
        p.addListener(any);
        p.addListener(first);
        System.out.println("set(start), the same:");
        p.set("start");
        System.out.println("set(next):");
        p.set("next");
        System.out.println("setValue(null):");
        p.setValue(null);
        System.out.println("set(null) again:");
        p.set(null);
        System.out.println("set(new String(next)), equal but not the same object:");
        p.set("next");
        p.set(new String("next"));
        p.removeListener(first);
        System.out.println("after removing first once, set(x):");
        p.set("x");
        p.removeListener(first);
        p.removeListener(any);
        p.removeListener(any);
        System.out.println("after removing all, set(y): (nothing)");
        p.set("y");
        try {
            p.addListener((ChangeListener<String>) null);
            System.out.println("addListener(null) is fine");
        } catch (NullPointerException e) {
            System.out.println("addListener(null): NullPointerException");
        }
        ObservableValue<String> value = p;
        System.out.println("getValue " + value.getValue() + ", " + p);

        SimpleStringProperty broken = new SimpleStringProperty("a");
        broken.addListener((obs, old, now) -> System.out.println("  listener 1 hears " + now));
        broken.addListener((obs, old, now) -> {
            throw new IllegalArgumentException("listener 2 fails on " + now);
        });
        broken.addListener((obs, old, now) -> System.out.println("  listener 3 still hears " + now));
        System.out.println("a failing listener:");
        broken.set("b");
        System.out.println("value " + broken.get());

        Label label = new Label("one");
        label.textProperty().addListener((obs, old, now) -> System.out.println("  label: " + old + " -> " + now + ", getText " + label.getText()));
        label.setText("one");
        label.setText("two");
        label.textProperty().set("three");
        label.textProperty().setValue("four");
        label.setText(null);
        System.out.println("label text " + label.getText() + ", property value " + label.textProperty().get());
        TextField field = new TextField();
        field.textProperty().addListener((obs, old, now) -> System.out.println("  field: \"" + old + "\" -> \"" + now + "\" (observable is the property: " + (obs == field.textProperty()) + ")"));
        Button reset = new Button("Reset");
        reset.setOnAction(e -> {
            field.setText("");
            label.setText("reset");
        });
        Button copy = new Button("Copy");
        copy.setOnAction(e -> label.setText(field.getText()));

        System.out.println("a listener that changes the value again:");
        SimpleStringProperty nested = new SimpleStringProperty("a");
        nested.addListener((obs, old, now) -> {
            System.out.println("  M1 " + old + " -> " + now);
            if (now.equals("b")) {
                nested.set("c");
            }
        });
        nested.addListener((obs, old, now) -> System.out.println("  M2 " + old + " -> " + now));
        nested.set("b");
        System.out.println("value " + nested.get());
        System.out.println("a listener that sets the old value back:");
        SimpleStringProperty back = new SimpleStringProperty("x");
        back.addListener((obs, old, now) -> {
            System.out.println("  B1 " + old + " -> " + now);
            if (!now.equals("x")) {
                back.set("x");
            }
        });
        back.addListener((obs, old, now) -> System.out.println("  B2 " + old + " -> " + now));
        back.addListener((obs, old, now) -> System.out.println("  B3 " + old + " -> " + now));
        back.set("y");
        System.out.println("value " + back.get());
        for (int count = 1; count <= 4; count++) {
            System.out.println("a listener that removes itself, then changes the value, with " + count + " listeners:");
            removesItself(count);
        }
        System.out.println("a listener added during a change:");
        SimpleStringProperty late = new SimpleStringProperty("1");
        late.addListener(new ChangeListener<String>() {
            @Override
            public void changed(ObservableValue<? extends String> obs, String old, String now) {
                System.out.println("  first " + old + " -> " + now);
                if (now.equals("2")) {
                    late.addListener((o, before, after) -> System.out.println("  added " + before + " -> " + after));
                    late.set("3");
                }
            }
        });
        late.set("2");
        late.set("4");
        System.out.println("changed while nobody listens, then the same value again:");
        SimpleStringProperty quiet = new SimpleStringProperty("s");
        ChangeListener<String> hear = (obs, old, now) -> System.out.println("  quiet " + old + " -> " + now);
        quiet.addListener(hear);
        quiet.removeListener(hear);
        quiet.set("t");
        quiet.addListener(hear);
        quiet.set("t");
        quiet.set("u");

        // Keeps only digits: a change to anything else is undone at once, inside the other listeners' round.
        TextField digits = new TextField();
        Label length = new Label("0");
        digits.textProperty().addListener((obs, old, now) -> {
            if (!now.matches("\\d*")) {
                digits.setText(old);
            }
        });
        digits.textProperty().addListener((obs, old, now) -> {
            System.out.println("  length hears \"" + old + "\" -> \"" + now + "\"");
            length.setText("" + now.length());
        });
        stage.setScene(new Scene(new VBox(label, field, reset, copy, digits, length)));
        stage.show();
    }

    static void removesItself(int count) {
        SimpleStringProperty p = new SimpleStringProperty("a");
        p.addListener(new ChangeListener<String>() {
            @Override
            public void changed(ObservableValue<? extends String> obs, String old, String now) {
                System.out.println("  W1 " + old + " -> " + now);
                p.removeListener(this);
                p.set("c");
            }
        });
        for (int i = 2; i <= count; i++) {
            String name = "W" + i;
            p.addListener((obs, old, now) -> System.out.println("  " + name + " " + old + " -> " + now));
        }
        p.set("b");
        System.out.println("  value " + p.get());
    }

    public static void main(String[] args) {
        launch(args);
    }
}
