// Probe: every kind of event (click, type, set, enter, close) and of target (#N, #id, Type "text",
// Type K), on enabled, disabled, hidden and read-only controls, and what the handlers see.
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonBase;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    private Label status;
    private TextField name;
    private TextField plain;
    private PasswordField secret;
    private TextArea notes;

    @Override
    public void start(Stage stage) {
        status = new Label("Ready");
        status.setId("status");
        name = new TextField();
        name.setPromptText("Name");
        name.textProperty().addListener((obs, old, now) -> System.out.println("name " + show(old) + " -> " + show(now)));
        name.setOnAction(e -> {
            System.out.println("Enter in name: " + show(name.getText()) + ", source is the field: " + (e.getSource() == name));
            status.setText("Hi " + name.getText());
        });
        plain = new TextField("no handler");
        plain.textProperty().addListener((obs, old, now) -> System.out.println("plain " + show(old) + " -> " + show(now)));
        secret = new PasswordField();
        secret.textProperty().addListener((obs, old, now) -> System.out.println("secret is " + now.length() + " characters"));
        notes = new TextArea();
        notes.textProperty().addListener((obs, old, now) -> System.out.println("notes " + show(now)));

        Button greet = new Button("Greet");
        greet.setId("greet");
        greet.setOnAction(e -> {
            status.setText("Hello, " + name.getText());
            System.out.println("Greet: source is the button " + (e.getSource() == greet) + ", " + e.getClass().getName());
        });
        Button count = new Button("Count");
        int[] clicks = { 0 };
        count.setOnAction(e -> System.out.println("Count " + ++clicks[0] + ", source " + ((ButtonBase) e.getSource()).getText()));
        Button inert = new Button("Inert");
        Button off = new Button("Off");
        off.setDisable(true);
        off.setOnAction(e -> System.out.println("the disabled button ran its handler"));
        Button hidden = new Button("Hidden");
        hidden.setVisible(false);
        hidden.setOnAction(e -> System.out.println("the hidden button ran its handler"));

        Button boxed = new Button("In a disabled box");
        boxed.setOnAction(e -> System.out.println("a button in a disabled box ran its handler"));
        TextField locked = new TextField("locked");
        locked.setOnAction(e -> System.out.println("a field in a disabled box ran its handler"));
        HBox disabledBox = new HBox(boxed, locked);
        disabledBox.setDisable(true);
        VBox hiddenBox = new VBox(new Button("In a hidden box"), new TextField("unseen"));
        hiddenBox.setVisible(false);
        TextField readOnly = new TextField("read only");
        readOnly.setEditable(false);
        TextField offField = new TextField("off field");
        offField.setDisable(true);

        VBox root = new VBox(6, status, name, plain, secret, notes, new HBox(4, greet, count, inert, off, hidden), disabledBox, hiddenBox, readOnly, offField, new Label("Just a label"));
        stage.setScene(new Scene(root, 400, 300));
        stage.setTitle("Events");
        stage.show();
    }

    @Override
    public void stop() {
        System.out.println("stop: status " + show(status.getText()) + ", name " + show(name.getText()) + ", plain " + show(plain.getText()) + ", secret " + show(secret.getText()) + ", notes " + show(notes.getText()));
    }

    static String show(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            sb.append(c == '\n' ? "\\n" : c == '\t' ? "\\t" : c < 0x20 || c > 0x7e ? String.format("\\u%04x", (int) c) : String.valueOf(c));
        }
        return sb.append('"').toString();
    }

    public static void main(String[] args) {
        launch(args);
        System.out.println("launch returned");
    }
}
