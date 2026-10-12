import java.util.HashMap;
import java.util.Map;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.Pane;
import javafx.stage.Stage;

public class Main extends Application {
    private Map<KeyCode, Boolean> pressed = new HashMap<>();

    @Override
    public void start(Stage stage) {
        Scene scene = new Scene(new Pane(), 600, 400);
        scene.setOnKeyPressed(event -> {
            pressed.put(event.getText(), Boolean.TRUE);
            if (event.getCode() == KeyCode.LEFT_ARROW || event.getCode() == KeyCode.SPACEBAR) {
                System.out.println("turn or fire");
            }
            if (event.getCode() == KeyCode.ESC || event.getCode() == KeyCode.a || event.getCode() == KeyCode.Up) {
                System.out.println("other keys");
            }
            if (event.getCode() == "RIGHT") {
                System.out.println("right");
            }
            if (event.getText() == KeyCode.A) {
                System.out.println("A");
            }
            switch (event.getCode()) {
                case "DOWN":
                    System.out.println("down");
                    break;
                default:
                    break;
            }
        });
        scene.setOnKeyReleased(event -> pressed.put("LEFT", Boolean.FALSE));
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
