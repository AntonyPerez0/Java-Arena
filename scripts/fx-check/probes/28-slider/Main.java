import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.ListIterator;
import java.util.concurrent.Callable;
import javafx.application.Application;
import javafx.beans.property.DoubleProperty;
import javafx.beans.property.SimpleDoubleProperty;
import javafx.beans.value.ChangeListener;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.Scene;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.control.Label;
import javafx.scene.control.Slider;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

// Probe: Slider (defaults, clamping, min and max that cross, NaN and -0.0, the tick settings and
// their checks, listeners that move it again), DoubleProperty and SimpleDoubleProperty, and
// FXCollections' lists with their index messages; then a window of sliders that the events move
// (set Slider N value: snapping to ticks as a thumb let go there does, the ends, a slider whose
// listener redraws a chart and a label) and every problem of a set line.
public class Main extends Application {
    static void p(Object o) {
        System.out.println(o);
    }

    static void t(String what, Callable<Object> c) {
        try {
            p(what + " = " + String.valueOf(c.call()).replaceAll("@[0-9a-f]+", "@H"));
        } catch (Throwable e) {
            p(what + " ! " + e);
        }
    }

    static String slider(Slider s) {
        return s.getMin() + " " + s.getMax() + " " + s.getValue() + " major " + s.getMajorTickUnit() + " minor " + s.getMinorTickCount() + " block " + s.getBlockIncrement() + " " + s.isShowTickLabels() + " " + s.isShowTickMarks() + " " + s.isSnapToTicks();
    }

    @Override
    public void start(Stage stage) {
        t("Slider()", () -> slider(new Slider()));
        t("Slider(0, 100, 150)", () -> new Slider(0, 100, 150).getValue());
        t("Slider(0, 100, -5)", () -> new Slider(0, 100, -5).getValue());
        t("Slider(50, 10, 20)", () -> slider(new Slider(50, 10, 20)));
        t("Slider(50, 10, 70)", () -> slider(new Slider(50, 10, 70)));
        t("Slider(0, 10, NaN)", () -> new Slider(0, 10, Double.NaN).getValue());
        t("Slider(10, 0, 0)", () -> slider(new Slider(10, 0, 0)));
        List<String> log = new ArrayList<>();
        Slider s2 = new Slider(0, 100, 50);
        s2.valueProperty().addListener((obs, o, n) -> log.add(o + "->" + n + " (" + n.getClass().getSimpleName() + ")"));
        s2.setValue(150);
        log.add("|");
        s2.setValue(100);
        log.add("|");
        s2.setValue(-5);
        log.add("|");
        s2.setMax(10);
        log.add("|max 10: " + s2.getValue());
        s2.setMin(20);
        log.add("|min 20: " + s2.getValue() + " min " + s2.getMin() + " max " + s2.getMax());
        s2.setValue(Double.NaN);
        log.add("|NaN: " + s2.getValue());
        p("slider listener " + log);
        log.clear();
        Slider s3 = new Slider(0, 100, 0);
        s3.valueProperty().addListener((obs, o, n) -> log.add(o + "->" + n));
        s3.setValue(0.0);
        s3.setValue(-0.0);
        log.add("|" + s3.getValue());
        s3.setValue(5);
        s3.setValue(5);
        p("slider zeros " + log);
        t("valueProperty()", () -> s3.valueProperty());
        t("valueProperty() is the same", () -> s3.valueProperty() == s3.valueProperty());
        t("valueProperty().getValue() class", () -> s3.valueProperty().getValue().getClass().getName());
        t("valueProperty().setValue(42)", () -> {
            Slider x = new Slider();
            x.valueProperty().setValue(42);
            return x.getValue();
        });
        t("setMajorTickUnit(0)", () -> {
            Slider x = new Slider();
            x.setMajorTickUnit(0);
            return x.getMajorTickUnit();
        });
        t("setMajorTickUnit(-1)", () -> {
            Slider x = new Slider();
            x.setMajorTickUnit(-1);
            return x.getMajorTickUnit();
        });
        t("setMajorTickUnit(NaN)", () -> {
            Slider x = new Slider();
            x.setMajorTickUnit(Double.NaN);
            return x.getMajorTickUnit();
        });
        t("setMinorTickCount(-1)", () -> {
            Slider x = new Slider();
            x.setMinorTickCount(-1);
            return x.getMinorTickCount();
        });
        t("setBlockIncrement(-1)", () -> {
            Slider x = new Slider();
            x.setBlockIncrement(-1);
            return x.getBlockIncrement();
        });
        t("setters", () -> {
            Slider x = new Slider();
            x.setShowTickLabels(true);
            x.setShowTickMarks(true);
            x.setSnapToTicks(true);
            x.setMajorTickUnit(10);
            x.setMinorTickCount(1);
            x.setBlockIncrement(2);
            return slider(x);
        });
        t("setMax below min", () -> {
            Slider x = new Slider(20, 80, 50);
            x.setMax(10);
            return slider(x);
        });
        t("setMin(NaN)", () -> {
            Slider x = new Slider(20, 80, 50);
            x.setMin(Double.NaN);
            return slider(x);
        });
        t("a listener that throws", () -> {
            Slider x = new Slider();
            x.valueProperty().addListener((o, a, b) -> {
                throw new RuntimeException("listener " + b);
            });
            x.setValue(5);
            return x.getValue();
        });
        t("a listener that moves it again", () -> {
            Slider x = new Slider(0, 10, 5);
            List<String> q = new ArrayList<>();
            x.valueProperty().addListener((o, a, b) -> {
                q.add("A " + a + "->" + b);
                if (b.doubleValue() > 8) {
                    x.setValue(1);
                }
            });
            x.valueProperty().addListener((o, a, b) -> q.add("B " + a + "->" + b));
            x.setValue(9);
            return q;
        });

        SimpleDoubleProperty d = new SimpleDoubleProperty();
        t("SimpleDoubleProperty", () -> d.get() + " " + d.getValue() + " " + d + " " + new SimpleDoubleProperty(2.5));
        List<String> dl = new ArrayList<>();
        ChangeListener<Number> l = (obs, o, n) -> dl.add(o + "->" + n);
        d.addListener(l);
        d.set(1);
        d.set(1);
        d.set(Double.NaN);
        d.set(Double.NaN);
        d.set(-0.0);
        d.set(0.0);
        d.set(-0.0);
        d.setValue(3);
        d.setValue(null);
        dl.add("v=" + d.get());
        d.removeListener(l);
        d.set(9);
        p("double listener " + dl);
        t("setValue(7)", () -> {
            SimpleDoubleProperty x = new SimpleDoubleProperty(4);
            x.setValue(7);
            return x.get() + " " + x.getValue();
        });
        t("DoubleProperty", () -> {
            DoubleProperty x = new SimpleDoubleProperty(1);
            return x + " " + x.get();
        });
        t("removeListener of one never added", () -> {
            SimpleDoubleProperty x = new SimpleDoubleProperty();
            x.removeListener((o, a, b) -> {
            });
            return "ok";
        });
        t("addListener(null)", () -> {
            SimpleDoubleProperty x = new SimpleDoubleProperty();
            x.addListener((ChangeListener<Number>) null);
            return "ok";
        });

        ObservableList<String> ol = FXCollections.observableArrayList("a", "b");
        t("observableArrayList(a, b)", () -> ol + " " + ol.equals(List.of("a", "b")) + " " + ol.hashCode());
        t("with null", () -> FXCollections.observableArrayList("a", null));
        t("from a collection", () -> FXCollections.observableArrayList(List.of(1, 2)));
        t("null array", () -> FXCollections.observableArrayList((String[]) null));
        t("null collection", () -> FXCollections.observableArrayList((Collection<String>) null));
        t("empty", () -> FXCollections.observableArrayList());
        t("remove(1, 2)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3);
            x.remove(1, 2);
            return x;
        });
        t("remove(2, 1)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3);
            x.remove(2, 1);
            return x;
        });
        t("remove(1, 5)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3);
            x.remove(1, 5);
            return x;
        });
        t("removeAll(2)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3, 2);
            x.removeAll(2);
            return x;
        });
        t("setAll(9, 8)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3);
            x.setAll(9, 8);
            return x;
        });
        t("add(5, 3)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1);
            x.add(5, 3);
            return x;
        });
        t("get(5)", () -> FXCollections.observableArrayList(1).get(5));
        t("remove(5)", () -> FXCollections.observableArrayList(1).remove(5));
        t("set(5, 1)", () -> FXCollections.observableArrayList(1).set(5, 1));
        t("subList(1, 3)", () -> FXCollections.observableArrayList(1, 2, 3).subList(1, 3));
        t("iterator remove", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3);
            Iterator<Integer> it = x.iterator();
            it.next();
            it.remove();
            return x;
        });
        t("addAll(4, list)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1);
            x.addAll(4, List.of(1));
            return x;
        });
        t("changed while iterating", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3);
            for (Integer i : x) {
                x.add(4);
            }
            return x;
        });
        t("sort(null)", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(3, 1, 2);
            x.sort(null);
            return x;
        });
        t("toArray", () -> Arrays.toString(FXCollections.observableArrayList(1, 2).toArray()));
        t("listIterator set and add", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2);
            ListIterator<Integer> it = x.listIterator();
            it.next();
            it.set(7);
            it.add(8);
            return x;
        });
        t("removeIf, retainAll, clear", () -> {
            ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3, 4);
            x.removeIf(i -> i % 2 == 0);
            x.retainAll(List.of(3));
            String a = x.toString();
            x.clear();
            return a + " " + x;
        });
        t("contains, indexOf, lastIndexOf", () -> {
            ObservableList<String> x = FXCollections.observableArrayList("a", "b", "a");
            return x.contains("b") + " " + x.indexOf("a") + " " + x.lastIndexOf("a");
        });
        t("remove(Object)", () -> {
            ObservableList<String> x = FXCollections.observableArrayList("a", "b");
            return x.remove("b") + " " + x.remove("z") + " " + x;
        });

        // The window.
        Slider plain = new Slider();
        Slider ticks = new Slider(0, 100, 50);
        ticks.setSnapToTicks(true);
        ticks.setShowTickLabels(true);
        ticks.setShowTickMarks(true);
        ticks.setMajorTickUnit(25);
        ticks.setMinorTickCount(4);
        Slider majorOnly = new Slider(3, 50, 3);
        majorOnly.setSnapToTicks(true);
        majorOnly.setMajorTickUnit(10);
        majorOnly.setMinorTickCount(0);
        Slider odd = new Slider(-1.5, 2.25, 0);
        odd.setSnapToTicks(true);
        odd.setMajorTickUnit(0.7);
        odd.setMinorTickCount(2);
        Slider off = new Slider();
        off.setDisable(true);
        Slider hidden = new Slider();
        hidden.setVisible(false);
        Slider flat = new Slider(5, 5, 5);
        Label value = new Label("value");
        NumberAxis xs = new NumberAxis(0, 10, 1);
        LineChart<Number, Number> chart = new LineChart<>(xs, new NumberAxis());
        chart.setTitle("Powers");
        XYChart.Series<Number, Number> series = new XYChart.Series<>();
        series.setName("x^1");
        chart.getData().add(series);
        for (Slider s : new Slider[] { plain, ticks, majorOnly, odd }) {
            s.valueProperty().addListener((o, a, b) -> value.setText(a + " -> " + b));
        }
        plain.valueProperty().addListener((o, a, b) -> {
            double k = b.doubleValue() / 25;
            series.setName("x^" + k);
            series.getData().clear();
            for (int i = 0; i <= 10; i += 2) {
                series.getData().add(new XYChart.Data<>(i, Math.pow(i, k)));
            }
        });
        stage.setScene(new Scene(new VBox(plain, ticks, majorOnly, odd, off, hidden, flat, value, chart)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
