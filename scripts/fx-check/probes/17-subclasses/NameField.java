import javafx.scene.control.TextField;

public class NameField extends TextField {
    public NameField() {
        setPromptText("name");
        setOnAction(e -> System.out.println("hello " + getText()));
    }
}
