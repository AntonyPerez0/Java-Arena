import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.stage.Stage;

/** A second window: a shopping list built from every kind of pane. */
public class ShoppingWindow extends Stage {
    private final FlowPane list = new FlowPane(6, 4);
    private final Label count = new Label("0 items");

    public ShoppingWindow() {
        Label title = new Label("Shopping list");
        title.setFont(Font.font("Serif", 22));
        title.setId("title");
        title.setStyle("-fx-text-fill: darkgreen");

        TextField item = new TextField();
        item.setPromptText("Item");
        item.setPrefWidth(160);
        Button add = new Button("Add");
        add.setOnAction(e -> addItem(item));
        item.setOnAction(e -> add.fire());
        Button clear = new Button("Clear");
        clear.setOnAction(e -> {
            list.getChildren().clear();
            System.out.println("cleared the list");
            javafx.application.Platform.runLater(() -> count.setText("0 items (cleared)"));
        });
        Button hidden = new Button("Hidden");
        hidden.setVisible(false);
        hidden.setOnAction(e -> System.out.println("the hidden button can't be clicked"));
        Button off = new Button("Off");
        off.setDisable(true);
        off.setOnAction(e -> System.out.println("the disabled button can't be clicked"));
        HBox controls = new HBox(5, item, add, clear, hidden, off);
        controls.setAlignment(Pos.CENTER_LEFT);

        PasswordField code = new PasswordField();
        TextArea notes = new TextArea("first line");
        notes.setWrapText(true);
        notes.setPrefSize(220, 60);
        notes.textProperty().addListener((obs, old, now) -> System.out.println("notes now " + now.length() + " characters"));
        TextField readOnly = new TextField("fixed");
        readOnly.setEditable(false);
        GridPane form = new GridPane();
        form.setHgap(4);
        form.setVgap(2);
        form.add(new Label("Notes"), 0, 1);
        form.add(notes, 1, 1, 2, 1);
        form.add(new Label("Code"), 0, 0);
        form.add(code, 1, 0);
        form.add(readOnly, 2, 0);
        System.out.println("code at column " + GridPane.getColumnIndex(code) + ", row " + GridPane.getRowIndex(code) + "; title at " + GridPane.getColumnIndex(title));

        StackPane badge = new StackPane(new Label("New"));
        badge.setAlignment(Pos.TOP_RIGHT);
        badge.setPrefSize(40, 40);

        BorderPane root = new BorderPane();
        root.setTop(title);
        root.setCenter(new VBox(6, controls, list, form));
        root.setRight(badge);
        root.setBottom(count);
        root.setLeft(new Label("left"));
        root.setLeft(new ItemLabel("L", 1));
        root.setPadding(new Insets(6));
        System.out.println("border pane children " + root.getChildren().size() + ", left is an " + root.getLeft().getClass().getSimpleName());

        setTitle("Shopping");
        setScene(new Scene(root, 480, 320));
        setWidth(500);
        setHeight(360);
    }

    private void addItem(TextField item) {
        String text = item.getText().trim();
        if (text.isEmpty()) {
            System.out.println("nothing to add");
            return;
        }
        list.getChildren().add(new ItemLabel(text, list.getChildren().size() + 1));
        item.clear();
        count.setText(list.getChildren().size() + (list.getChildren().size() == 1 ? " item" : " items"));
        System.out.println("added " + text + ", now " + count.getText());
    }

    int items() {
        return list.getChildren().size();
    }
}
