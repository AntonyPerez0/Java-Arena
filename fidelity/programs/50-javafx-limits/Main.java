import javafx.application.Application;
import javafx.collections.FXCollections;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.image.ImageView;
import javafx.scene.image.PixelWriter;
import javafx.scene.image.WritableImage;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.stage.Stage;

// The most a part 14 program may ask of Java Arena's JavaFX at once: a canvas with more drawing
// calls than the library keeps (5000, each with a color of its own), an image of 512 x 512 (the
// biggest whose pixels the window carries), and a chart whose 1000 points are added one by one,
// then moved along one by one. The suite's browser run must stay well inside the JavaFX time limit.
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Canvas canvas = new Canvas(250, 100);
        GraphicsContext g = canvas.getGraphicsContext2D();
        int calls = 0;
        for (int y = 0; y < 21; y++) {
            for (int x = 0; x < 250; x++) {
                g.setFill(Color.rgb(x, (y * 12) % 256, (x + y) % 256));
                g.fillRect(x, y, 1, 1);
                calls++;
            }
        }
        WritableImage image = new WritableImage(512, 512);
        PixelWriter pixels = image.getPixelWriter();
        for (int y = 0; y < 512; y++) {
            for (int x = 0; x < 512; x++) {
                pixels.setArgb(x, y, 0xff000000 | ((x & 255) << 16) | ((y & 255) << 8) | ((x ^ y) & 255));
            }
        }
        LineChart<Number, Number> chart = new LineChart<>(new NumberAxis(), new NumberAxis());
        chart.setCreateSymbols(false);
        XYChart.Series<Number, Number> wave = new XYChart.Series<>();
        wave.setName("wave");
        chart.getData().add(wave);
        for (int i = 0; i < 1000; i++) {
            wave.getData().add(new XYChart.Data<>(i, (i * 7) % 100));
        }
        for (int i = 1000; i < 2000; i++) {
            wave.getData().remove(0);
            wave.getData().add(new XYChart.Data<>(i, (i * 7) % 100));
        }
        stage.setScene(new Scene(new VBox(canvas, new ImageView(image), chart)));
        stage.show();
        System.out.println(calls + " calls, an image of " + (int) image.getWidth() + " x " + (int) image.getHeight() + ", " + wave.getData().size() + " points from x = " + wave.getData().get(0).getXValue());
    }

    public static void main(String[] args) {
        launch(args);
    }
}
