import javafx.application.Application;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.beans.property.StringProperty;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.stage.Stage;

public class Main extends Application {
    private Label greeting;
    private ShoppingWindow shopping;

    @Override
    public void init() {
        System.out.println("init on " + Thread.currentThread().getName() + ", FX thread: " + Platform.isFxApplicationThread());
        Parameters p = getParameters();
        System.out.println("raw " + p.getRaw() + ", named " + p.getNamed() + ", unnamed " + p.getUnnamed());
    }

    @Override
    public void start(Stage stage) {
        System.out.println("start on " + Thread.currentThread().getName() + ", FX thread: " + Platform.isFxApplicationThread() + ", a new thread is " + new Thread(() -> { }).getName());
        System.out.println("title " + stage.getTitle() + ", width " + stage.getWidth() + ", resizable " + stage.isResizable() + ", showing " + stage.isShowing());
        checkBasics();

        TextField name = new TextField();
        name.setPromptText("Your name");
        greeting = new Label("Hello!");
        greeting.setWrapText(true);
        Button broken = new Button("Broken");
        broken.setOnAction(e -> {
            throw new IllegalStateException("the Broken button is broken");
        });
        Button open = new Button("Open list");
        open.setOnAction(e -> {
            if (shopping == null) {
                shopping = new ShoppingWindow();
                shopping.show();
                System.out.println("second window open: " + shopping.isShowing());
            }
        });
        name.setOnAction(e -> {
            TextField source = (TextField) e.getSource();
            greeting.setText("Hello, " + source.getText() + "!");
            System.out.println("enter in the name field, greeting: " + greeting.getText());
            Platform.runLater(() -> {
                System.out.println("runLater 1");
                Platform.runLater(() -> System.out.println("runLater 3 (queued by 1)"));
            });
            Platform.runLater(() -> System.out.println("runLater 2"));
            System.out.println("handler done");
        });
        name.textProperty().addListener((obs, old, now) -> System.out.println("name: \"" + old + "\" -> \"" + now + "\""));

        VBox root = new VBox(8);
        root.getChildren().addAll(new Label("Main window"), name, greeting, new HBox(4, broken, open));
        root.setPadding(new Insets(12, 8, 12, 8));
        root.setAlignment(Pos.TOP_CENTER);
        Scene scene = new Scene(root);
        stage.setScene(scene);
        stage.setTitle("Main");
        stage.setResizable(false);
        // Before show(): a scene made without a size is 0 x 0 (JavaFX lays it out when it shows; Java Arena doesn't).
        System.out.println("scene " + scene.getWidth() + " x " + scene.getHeight() + ", root is a " + scene.getRoot().getClass().getSimpleName() + ", showing " + stage.isShowing());
        stage.show();
        Platform.runLater(() -> System.out.println("runLater queued in start"));
        // As in JavaFX, a null task is accepted, and fails (on System.err) when its turn comes.
        Platform.runLater(null);
        System.out.println("start done");
    }

    /** The parts of the API that need no window. */
    private void checkBasics() {
        Insets in = new Insets(10);
        System.out.println(in + " equals " + in.equals(new Insets(10, 10, 10, 10)) + ", EMPTY " + Insets.EMPTY + ", hash " + new Insets(1, 2, 3, 4).hashCode());
        Font def = Font.getDefault();
        System.out.println(def + ", " + Font.font(20) + ", " + Font.font("Serif", 16).getFamily() + ", default equals font(13) " + def.equals(Font.font(13)) + ", hash " + def.hashCode());
        System.out.println(Font.font("serif", 16) + ", " + new Font("Monospaced Bold", 9).getFamily() + ", " + new Font("Serif", 9).getName() + ", " + Font.font("Dialog", 9).getName() + ", " + Font.font("Serif Italic", 9).getName() + ", hash " + Font.font("Serif", 20).hashCode());
        System.out.println(java.util.Arrays.toString(Pos.values()));

        StringProperty prop = new SimpleStringProperty("a");
        prop.addListener((obs, old, now) -> System.out.println("property: " + old + " -> " + now + " (same object: " + (obs == prop) + ")"));
        prop.set("a");
        prop.set("b");
        prop.setValue(null);
        prop.set(null);
        System.out.println("property value " + prop.getValue() + ", " + new SimpleStringProperty("x"));

        Label text = new Label();
        System.out.println("label text \"" + text.getText() + "\", font default " + text.getFont().equals(Font.getDefault()) + ", style \"" + text.getStyle() + "\", id " + text.getId());
        TextField field = new TextField("one\ttwo\nthree");
        System.out.println("text field keeps \"" + field.getText() + "\", length " + field.getLength());
        field.setText(null);
        System.out.println("after setText(null): " + field.getText() + ", length " + field.getLength());
        field.appendText("x");
        field.clear();
        System.out.println("after clear: \"" + field.getText() + "\"");

        VBox outer = new VBox();
        HBox inner = new HBox();
        Button deep = new Button("Deep");
        deep.setId("deep");
        inner.getChildren().add(deep);
        outer.getChildren().add(inner);
        outer.setDisable(true);
        System.out.println("disable " + deep.isDisable() + ", disabled " + deep.isDisabled() + ", lookup " + (outer.lookup("#deep") == deep) + ", parent " + (deep.getParent() == inner) + ", scene " + deep.getScene());
        outer.setDisable(false);
        tryChange("duplicate", () -> inner.getChildren().add(deep));
        tryChange("null", () -> inner.getChildren().add(null));
        tryChange("cycle", () -> inner.getChildren().add(outer));
        Pane other = new Pane();
        other.getChildren().add(deep);
        System.out.println("moved: inner has " + inner.getChildren().size() + ", other has " + other.getChildren().size() + ", unmodifiable " + other.getChildrenUnmodifiable().size());
        other.getChildren().addAll(new Label("1"), new Label("2"), new Label("3"));
        other.getChildren().remove(1, 3);
        System.out.println("after remove(1, 3): " + texts(other));
        other.getChildren().setAll(new Label("x"), new Label("y"));
        System.out.println("after setAll: " + texts(other) + ", deep's parent " + deep.getParent());
        tryChange("unmodifiable", () -> other.getChildrenUnmodifiable().add(new Label()));
        tryChange("add at 5", () -> other.getChildren().add(5, new Label("z")));
        tryChange("add null at 5", () -> other.getChildren().add(5, null));
        tryChange("remove(1, 0)", () -> other.getChildren().remove(1, 0));
    }

    private static String texts(Pane pane) {
        StringBuilder sb = new StringBuilder();
        for (Node n : pane.getChildren()) {
            sb.append(n instanceof Label ? ((Label) n).getText() : n.getClass().getSimpleName()).append(' ');
        }
        return sb.toString().trim();
    }

    private static void tryChange(String what, Runnable change) {
        try {
            change.run();
            System.out.println(what + ": no exception");
        } catch (RuntimeException e) {
            String message = String.valueOf(e.getMessage());
            int cut = message.indexOf(": parent = ");
            System.out.println(what + ": " + e.getClass().getName() + ": " + (cut >= 0 ? message.substring(0, cut) : message));
        }
    }

    @Override
    public void stop() {
        System.out.println("stop on " + Thread.currentThread().getName() + ", greeting \"" + greeting.getText() + "\", items " + (shopping == null ? 0 : shopping.items()));
    }

    public static void main(String[] args) {
        System.out.println("FX thread in main: " + Platform.isFxApplicationThread());
        launch(args);
        System.out.println("launch returned");
        try {
            launch(args);
        } catch (IllegalStateException e) {
            System.out.println("again: " + e.getMessage());
        }
    }
}
