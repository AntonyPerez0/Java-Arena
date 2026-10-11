import javafx.application.Application;
import javafx.beans.value.ChangeListener;
import javafx.beans.value.ObservableValue;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.control.Label;
import javafx.scene.control.Slider;
import javafx.scene.image.Image;
import javafx.scene.image.WritableImage;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Slider size = new Slider(0, 100, 50);
        Label shown = new Label();
        size.valueProperty().addListener((ObservableValue<? extends Double> observable, Double oldValue, Double newValue) -> shown.setText("" + newValue));
        size.valueProperty().addListener(new ChangeListener<Double>() {
            @Override
            public void changed(ObservableValue<? extends Double> observable, Double oldValue, Double newValue) {
                shown.setText("" + newValue);
            }
        });
        size.valueProperty().addListener((ObservableValue<? extends Number> observable, Double oldValue, Double newValue) -> shown.setText("" + newValue));
        size.valueProperty().addListener((observable, oldValue, newValue) -> {
            int width = newValue;
            double twice = newValue * 2;
            shown.setText(newValue);
        });
        int start = size.getValue();
        Image photo = new Image("file:photo.png");
        int columns = photo.getWidth();
        WritableImage copy = new WritableImage(photo.getWidth(), photo.getHeight());
        Canvas canvas = new Canvas(100, 100);
        canvas.setOnMouseClicked(event -> {
            int x = event.getX();
        });
        stage.setScene(new Scene(new VBox(size, shown, canvas)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
