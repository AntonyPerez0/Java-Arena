import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class TodoApp extends Application {
    private final VBox items = new VBox();

    @Override
    public void start(Stage stage) {
        System.out.println("parameters " + getParameters().getRaw() + ", unnamed " + getParameters().getUnnamed() + ", named " + getParameters().getNamed());
        TextField input = new TextField();
        Button add = new Button("Add");
        add.setOnAction(e -> {
            items.getChildren().add(new Label(input.getText()));
            input.clear();
        });
        input.setOnAction(e -> add.fire());
        Button done = new Button("Done");
        done.setOnAction(e -> {
            System.out.println(items.getChildren().size() + " items, saved, closing");
            StringBuilder text = new StringBuilder();
            for (javafx.scene.Node item : items.getChildren()) {
                text.append(((Label) item).getText()).append('\n');
            }
            try {
                java.nio.file.Files.writeString(java.nio.file.Path.of("todo.txt"), text);
            } catch (java.io.IOException ex) {
                throw new java.io.UncheckedIOException(ex);
            }
            stage.close();
        });
        BorderPane root = new BorderPane();
        root.setTop(new HBox(input, add));
        root.setCenter(items);
        root.setBottom(done);
        stage.setScene(new Scene(root));
        stage.setTitle("Todo");
        stage.show();
    }

    @Override
    public void stop() {
        System.out.println("stop with " + items.getChildren().size() + " items");
    }
}
