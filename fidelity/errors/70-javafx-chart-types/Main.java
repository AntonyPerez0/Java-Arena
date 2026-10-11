import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.chart.BarChart;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        LineChart<Number, Number> growth = new LineChart<>(new CategoryAxis(), new NumberAxis());
        BarChart<String, Number> votes = new BarChart<>(new NumberAxis(), new NumberAxis());
        CategoryAxis years = new CategoryAxis();
        LineChart<Number, Number> prices = new LineChart<Number, Number>(years, new NumberAxis());
        XYChart.Series<Number, Number> population = new XYChart.Series<>();
        population.getData().add(new XYChart.Data<>("2015", 5472));
        population.getData().add(new XYChart.Data<Number, Number>("2016", 5487));
        population.getData().add(new XYChart.Data<>(2017, "5503"));
        XYChart.Series<String, Number> parties = new XYChart.Series<>();
        parties.getData().add(new XYChart.Data<>(1, 20));
        growth.getData().add(parties);
        votes.getData().add(population);
        XYChart.Series raw = new XYChart.Series();
        for (XYChart.Data<Number, Number> point : raw.getData()) {
            System.out.println(point.getYValue());
        }
        stage.setScene(new Scene(new VBox(growth, votes)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
