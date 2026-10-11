import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.chart.Data;
import javafx.scene.chart.LineChart;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        NumberAxis years = new NumberAxis();
        CategoryAxis cities = new CategoryAxis();
        LineChart<Number, Number> chart = new LineChart<>(years, new NumberAxis());
        XYChart.Series<Number, Number> rainfall = new XYChart.Series<>();
        rainfall.getData().add(new XYChart.Data<>(2020, 650));
        Series<Number, Number> snow = new Series<>();
        snow.getData().add(new Data<>(2020, 120));
        Canvas canvas = new Canvas(200, 100);
        GraphicsContext painter = canvas.getGraphicsContext2D();
        painter.setFill(Color.DARKBLUE);
        Image photo = new Image("file:photo.png");
        PixelReader reader = photo.getPixelReader();
        WritableImage copy = new WritableImage(32, 24);
        canvas.setOnMouseDragged((MouseEvent event) -> painter.fillOval(event.getX(), event.getY(), 4, 4));
        stage.setScene(new Scene(new VBox(chart, canvas)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
