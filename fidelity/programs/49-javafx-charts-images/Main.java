import javafx.application.Application;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.chart.BarChart;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.ScatterChart;
import javafx.scene.chart.XYChart;
import javafx.scene.control.Label;
import javafx.scene.control.Slider;
import javafx.scene.image.ImageView;
import javafx.scene.image.WritableImage;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Colors.show();
        Pictures pictures = new Pictures();
        Sketch sketch = new Sketch(220, 140);

        // A line chart whose second series the slider changes.
        NumberAxis years = new NumberAxis("Year", 2000, 2020, 5);
        NumberAxis people = new NumberAxis();
        people.setLabel("People (thousands)");
        LineChart<Number, Number> line = new LineChart<>(years, people);
        line.setTitle("Population");
        XYChart.Series<Number, Number> helsinki = new XYChart.Series<>();
        helsinki.setName("Helsinki");
        int[] counts = { 555, 560, 588, 620, 650 };
        for (int i = 0; i < counts.length; i++) {
            helsinki.getData().add(new XYChart.Data<>(2000 + 5 * i, counts[i]));
        }
        XYChart.Series<Number, Number> scaled = new XYChart.Series<>("Scaled", FXCollections.observableArrayList());
        line.getData().addAll(helsinki, scaled);
        line.setCreateSymbols(false);
        // Adding a series twice: JavaFX keeps it and reports the exception to the uncaught exception handler.
        line.getData().add(helsinki);
        System.out.println("series in the line chart: " + line.getData().size() + " " + line.getData());

        Slider slider = new Slider(0, 100, 20);
        slider.setShowTickLabels(true);
        slider.setShowTickMarks(true);
        slider.setMajorTickUnit(10);
        slider.setMinorTickCount(1);
        slider.setSnapToTicks(true);
        Label sliderLabel = new Label("Scale 20.0");
        slider.valueProperty().addListener((observable, oldValue, newValue) -> {
            sliderLabel.setText("Scale " + newValue);
            System.out.println("slider " + oldValue + " -> " + newValue + " (" + newValue.getClass().getSimpleName() + ")");
            ObservableList<XYChart.Data<Number, Number>> points = FXCollections.observableArrayList();
            for (XYChart.Data<Number, Number> d : helsinki.getData()) {
                points.add(new XYChart.Data<>(d.getXValue(), d.getYValue().doubleValue() * newValue.doubleValue() / 100));
            }
            scaled.setData(points);
        });

        // A bar chart with the categories given, one of them missing from the data, and one data
        // point in a category the axis doesn't have.
        CategoryAxis months = new CategoryAxis(FXCollections.observableArrayList("Jan", "Feb", "Mar"));
        months.setLabel("Month");
        BarChart<String, Number> bars = new BarChart<>(months, new NumberAxis(0, 30, 10));
        bars.setLegendVisible(false);
        XYChart.Series<String, Number> rain = new XYChart.Series<>("Rain", FXCollections.observableArrayList(new XYChart.Data<>("Jan", 12.5), new XYChart.Data<>("Mar", 20), new XYChart.Data<>("Apr", 7)));
        bars.getData().add(rain);

        // A scatter chart with auto-ranging axes and a category axis filled from the data.
        ScatterChart<String, Number> scatter = new ScatterChart<>(new CategoryAxis(), new NumberAxis());
        XYChart.Series<String, Number> a = new XYChart.Series<>();
        a.getData().addAll(new XYChart.Data<>("north", 3), new XYChart.Data<>("south", 1.25f), new XYChart.Data<>("east", 10000000000L));
        XYChart.Series<String, Number> b = new XYChart.Series<>("B", FXCollections.observableArrayList(new XYChart.Data<>("west", -0.001), new XYChart.Data<>("north", 0.0001)));
        scatter.getData().addAll(a, b);
        scatter.setAnimated(false);

        ImageView original = new ImageView(pictures.picture);
        original.setId("original");
        ImageView changed = new ImageView(pictures.negative);
        ImageView icon = new ImageView("file:icon.png");
        ImageView none = new ImageView();
        ImageView broken = new ImageView("file:missing.png");
        original.setOnMouseClicked(e -> System.out.println("picture clicked at " + e.getX() + ", " + e.getY() + ": " + pictures.picture.getPixelReader().getColor((int) e.getX(), (int) e.getY())));

        VBox root = new VBox(10, new HBox(5, sketch.canvas, new VBox(slider, sliderLabel)), line, new HBox(bars, scatter), new HBox(4, original, changed, icon, none, broken));
        stage.setTitle("Charts and images");
        stage.setScene(new Scene(root, 640, 720));
        stage.show();
        System.out.println("categories after showing: " + ((CategoryAxis) scatter.getXAxis()).getCategories() + " " + months.getCategories());
    }

    @Override
    public void stop() {
        System.out.println("stop");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
