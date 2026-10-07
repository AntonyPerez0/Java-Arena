// Probe: text fields and areas: what they keep of a text, setText(null), appendText, clear,
// getLength, prompt text, editable, a password field's text, a field's Enter handler, wrapText.
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputControl;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    static String show(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            sb.append(c == '\n' ? "\\n" : c == '\t' ? "\\t" : c == '\r' ? "\\r" : c < 0x20 || c > 0x7e ? String.format("\\u%04x", (int) c) : String.valueOf(c));
        }
        return sb.append('"').toString();
    }

    static void report(String what, TextInputControl t) {
        System.out.println(what + ": " + show(t.getText()) + ", length " + t.getLength());
    }

    @Override
    public void start(Stage stage) {
        String messy = "a\tb\nc\rd\u0007e\u007ff\u00e9g\u2028h\uD83D\uDE00";
        TextField field = new TextField(messy);
        report("TextField(messy)", field);
        TextArea area = new TextArea(messy);
        report("TextArea(messy)", area);
        PasswordField password = new PasswordField();
        password.setText(messy);
        report("PasswordField setText(messy)", password);
        field.setText(null);
        report("TextField setText(null)", field);
        field.appendText("x");
        report("then appendText(x)", field);
        field.appendText("\n");
        report("then appendText(newline)", field);
        field.appendText("");
        field.clear();
        report("then clear()", field);
        area.setText(null);
        report("TextArea setText(null)", area);
        area.appendText("one\r\ntwo");
        report("then appendText(one CR LF two)", area);
        TextArea nullArea = new TextArea(null);
        report("TextArea(null)", nullArea);
        TextField nullField = new TextField(null);
        report("TextField(null)", nullField);
        field.setPromptText("prompt");
        System.out.println("prompt " + show(field.getPromptText()));
        field.setPromptText(null);
        System.out.println("prompt after null " + show(field.getPromptText()));
        area.setPromptText("area prompt");
        area.setWrapText(true);
        System.out.println("area wrap " + area.isWrapText());

        TextField locked = new TextField("locked");
        locked.setEditable(false);
        locked.setText("set by the program");
        locked.appendText(" and appended");
        report("not editable, set by the program", locked);

        Label echo = new Label();
        TextField entry = new TextField();
        entry.setPromptText("type and press Enter");
        entry.setId("entry");
        entry.setOnAction(e -> {
            echo.setText("entered " + entry.getText());
            entry.clear();
            System.out.println(echo.getText() + ", onAction set " + (entry.getOnAction() != null));
        });
        Button show = new Button("Show");
        show.setOnAction(e -> {
            report("password", password);
            report("area", area);
            report("field", field);
        });
        stage.setScene(new Scene(new VBox(field, area, password, locked, entry, echo, show, nullArea, nullField)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
