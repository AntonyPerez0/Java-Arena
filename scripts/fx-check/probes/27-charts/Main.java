import java.util.concurrent.Callable;
import javafx.application.Application;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.Scene;
import javafx.scene.chart.Axis;
import javafx.scene.chart.BarChart;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.ScatterChart;
import javafx.scene.chart.XYChart;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

// Probe: charts. Every axis constructor and setter, CategoryAxis's categories and their checks,
// Series and Data (constructors, toString, setters), LineChart, BarChart and ScatterChart with
// their defaults, setters and checks (null axes, the same axis twice, a BarChart without a
// category axis), series and data added twice, null series and data, show() with a null value in
// every kind of chart, a category that isn't in the list given, and a window with all three kinds
// (titles, no legend, no symbols, labels, bounds, several series) whose data the buttons change.
public class Main extends Application {
    static void p(Object o) {
        System.out.println(o);
    }

    static void t(String what, Callable<Object> c) {
        try {
            p(what + " = " + String.valueOf(c.call()).replaceAll("@[0-9a-f]+", "@H"));
        } catch (Throwable e) {
            p(what + " ! " + e.toString().replaceAll("@[0-9a-f]+", "@H"));
        }
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    static XYChart make(String kind, boolean catX) {
        Axis x = catX ? new CategoryAxis() : new NumberAxis();
        Axis y = new NumberAxis();
        return kind.equals("line") ? new LineChart(x, y) : kind.equals("bar") ? new BarChart(x, y) : new ScatterChart(x, y);
    }

    @Override
    @SuppressWarnings({ "unchecked", "rawtypes" })
    public void start(Stage stage) throws Exception {
        Thread.currentThread().setUncaughtExceptionHandler((th, e) -> System.out.println("   UNCAUGHT: " + e.toString().replaceAll("@[0-9a-f]+", "@H")));
        NumberAxis x = new NumberAxis();
        t("NumberAxis()", () -> x.getLabel() + " auto " + x.isAutoRanging() + " lo " + x.getLowerBound() + " hi " + x.getUpperBound() + " tick " + x.getTickUnit() + " zero " + x.isForceZeroInRange() + " minor " + x.isMinorTickVisible());
        t("NumberAxis(1, 9, 2)", () -> {
            NumberAxis a = new NumberAxis(1, 9, 2);
            return a.getLabel() + " auto " + a.isAutoRanging() + " lo " + a.getLowerBound() + " hi " + a.getUpperBound() + " tick " + a.getTickUnit() + " zero " + a.isForceZeroInRange();
        });
        t("NumberAxis(\"L\", 1, 9, 2)", () -> {
            NumberAxis a = new NumberAxis("L", 1, 9, 2);
            return a.getLabel() + " auto " + a.isAutoRanging() + " " + a.getLowerBound() + " " + a.getUpperBound() + " " + a.getTickUnit();
        });
        t("NumberAxis(9, 1, -2)", () -> {
            NumberAxis a = new NumberAxis(9, 1, -2);
            return a.getLowerBound() + " " + a.getUpperBound() + " " + a.getTickUnit();
        });
        t("setTickUnit(0)", () -> {
            NumberAxis a = new NumberAxis();
            a.setTickUnit(0);
            return a.getTickUnit();
        });
        t("axis setters", () -> {
            NumberAxis a = new NumberAxis();
            a.setLabel("x");
            a.setAutoRanging(false);
            a.setLowerBound(-3);
            a.setUpperBound(3);
            a.setMinorTickVisible(false);
            a.setForceZeroInRange(false);
            return a.getLabel() + " " + a.isAutoRanging() + " " + a.getLowerBound() + " " + a.getUpperBound() + " " + a.isMinorTickVisible() + " " + a.isForceZeroInRange();
        });
        t("CategoryAxis()", () -> {
            CategoryAxis c = new CategoryAxis();
            return c.getLabel() + " auto " + c.isAutoRanging() + " categories " + c.getCategories();
        });
        t("CategoryAxis(list)", () -> {
            CategoryAxis a = new CategoryAxis(FXCollections.observableArrayList("a", "b"));
            return "auto " + a.isAutoRanging() + " categories " + a.getCategories();
        });
        t("CategoryAxis(null)", () -> new CategoryAxis(null));
        t("CategoryAxis with a category twice", () -> new CategoryAxis(FXCollections.observableArrayList("a", "a")));
        t("category added twice", () -> {
            CategoryAxis a = new CategoryAxis();
            boolean r1 = a.getCategories().add("a");
            boolean r2 = a.getCategories().add("a");
            return r1 + " " + r2 + " " + a.getCategories() + " auto " + a.isAutoRanging();
        });
        t("null category", () -> {
            CategoryAxis a = new CategoryAxis();
            a.getCategories().add(null);
            return a.getCategories();
        });
        t("the list given is the list", () -> {
            ObservableList<String> l = FXCollections.observableArrayList("a");
            CategoryAxis a = new CategoryAxis(l);
            l.add("z");
            return (a.getCategories() == l) + " " + a.getCategories();
        });

        LineChart<Number, Number> lc = new LineChart<>(x, new NumberAxis());
        t("LineChart defaults", () -> lc.getTitle() + " legend " + lc.isLegendVisible() + " symbols " + lc.getCreateSymbols() + " data " + lc.getData() + " x axis " + (lc.getXAxis() == x));
        t("chart setters", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            c.setTitle("T");
            c.setLegendVisible(false);
            c.setAnimated(false);
            c.setCreateSymbols(false);
            return c.getTitle() + " " + c.isLegendVisible() + " " + c.getCreateSymbols();
        });
        t("LineChart(null, number)", () -> new LineChart<Number, Number>(null, new NumberAxis()));
        t("LineChart(number, null)", () -> new LineChart<Number, Number>(new NumberAxis(), null));
        t("ScatterChart(null, null)", () -> new ScatterChart<Number, Number>(null, null));
        t("BarChart(category, null)", () -> new BarChart<String, Number>(new CategoryAxis(), null));
        t("BarChart(null, number)", () -> new BarChart<String, Number>(null, new NumberAxis()));
        t("LineChart with the same axis twice", () -> {
            NumberAxis a = new NumberAxis();
            return new LineChart<Number, Number>(a, a).getXAxis() == a;
        });
        t("BarChart(number, number)", () -> new BarChart<Number, Number>(new NumberAxis(), new NumberAxis()));
        t("BarChart(category, category)", () -> new BarChart<String, String>(new CategoryAxis(), new CategoryAxis()));
        t("BarChart(number, category)", () -> new BarChart<Number, String>(new NumberAxis(), new CategoryAxis()).getData().size());

        XYChart.Series<Number, Number> s = new XYChart.Series<>();
        t("Series()", () -> s.getName() + " " + s.getData() + " " + s);
        t("Series(null)", () -> new XYChart.Series<Number, Number>(null).getData());
        t("Series(name, null)", () -> new XYChart.Series<Number, Number>("n", null).getData());
        t("Series(name, list)", () -> new XYChart.Series<>("N", FXCollections.observableArrayList(new XYChart.Data<>(1, 2))).toString());
        t("Data()", () -> new XYChart.Data<Number, Number>() + "");
        t("Data(1, 2.5)", () -> new XYChart.Data<Number, Number>(1, 2.5) + "");
        t("Data(\"a\", null)", () -> new XYChart.Data<String, Number>("a", null) + "");
        t("Data setters", () -> {
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            d.setXValue(5);
            d.setYValue(null);
            return d + " " + d.getXValue() + " " + d.getYValue();
        });
        t("Data equals", () -> new XYChart.Data<>(1, 1).equals(new XYChart.Data<>(1, 1)));
        s.getData().add(new XYChart.Data<>(1, 2));
        lc.getData().add(s);
        t("the same series added twice", () -> {
            lc.getData().add(s);
            return lc.getData().size();
        });
        t("a null series", () -> {
            lc.getData().add(null);
            return lc.getData().size();
        });
        t("setAll with a series twice", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            c.getData().setAll(a, a);
            return c.getData().size();
        });
        t("remove a series", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            c.getData().add(a);
            c.getData().remove(a);
            return c.getData().size();
        });
        t("chart setData(null)", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            c.setData(null);
            return c.getData();
        });
        t("chart setData with a series twice", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            c.setData(FXCollections.observableArrayList(a, a));
            return c.getData().size();
        });
        t("chart setData keeps the list", () -> {
            ObservableList<XYChart.Series<Number, Number>> l = FXCollections.observableArrayList();
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            c.setData(l);
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            l.add(a);
            l.add(a);
            return (c.getData() == l) + " " + c.getData().size();
        });
        t("the old list after setData", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            ObservableList<XYChart.Series<Number, Number>> old = c.getData();
            c.setData(FXCollections.observableArrayList());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            old.add(a);
            old.add(a);
            return old.size();
        });
        t("Series setData(null)", () -> {
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            a.setData(null);
            return a.getData();
        });
        t("the same data twice, not in a chart", () -> {
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            boolean r1 = a.getData().add(d);
            boolean r2 = a.getData().add(d);
            return r1 + " " + r2 + " " + a.getData();
        });
        t("the same data twice, in a chart", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            c.getData().add(a);
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            a.getData().add(d);
            a.getData().add(d);
            return a.getData().size();
        });
        t("the same data twice in addAll", () -> {
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            a.getData().addAll(d, d);
            return a.getData();
        });
        t("equal data, not the same", () -> {
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            a.getData().addAll(new XYChart.Data<>(1, 1), new XYChart.Data<>(1, 1));
            return a.getData();
        });
        t("null data", () -> {
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            a.getData().add(null);
            return a.getData().size();
        });
        t("null data in a chart", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            c.getData().add(a);
            a.getData().add(null);
            return a.getData().size();
        });
        t("data in two series", () -> {
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            XYChart.Series<Number, Number> b = new XYChart.Series<>();
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            a.getData().add(d);
            b.getData().add(d);
            return a.getData().size() + " " + b.getData().size();
        });
        t("data in two series of a chart", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            XYChart.Series<Number, Number> b = new XYChart.Series<>();
            c.getData().addAll(a, b);
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            a.getData().add(d);
            b.getData().add(d);
            return a.getData().size() + " " + b.getData().size();
        });
        t("Series setData with data twice", () -> {
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            a.setData(FXCollections.observableArrayList(d, d));
            return a.getData();
        });
        t("Series(list) with data twice", () -> {
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            return new XYChart.Series<>(FXCollections.observableArrayList(d, d)).getData();
        });
        t("Series(list) keeps the list", () -> {
            ObservableList<XYChart.Data<Number, Number>> l = FXCollections.observableArrayList();
            return new XYChart.Series<>(l).getData() == l;
        });
        t("bar chart with a null y, added later", () -> {
            BarChart<String, Number> b = new BarChart<>(new CategoryAxis(), new NumberAxis());
            XYChart.Series<String, Number> a = new XYChart.Series<>();
            b.getData().add(a);
            a.getData().add(new XYChart.Data<>("a", null));
            return "ok";
        });
        t("bar chart with a null y", () -> {
            BarChart<String, Number> b = new BarChart<>(new CategoryAxis(), new NumberAxis());
            XYChart.Series<String, Number> a = new XYChart.Series<>();
            a.getData().add(new XYChart.Data<>("a", null));
            b.getData().add(a);
            return "ok";
        });
        t("bar chart with a null x", () -> {
            BarChart<String, Number> b = new BarChart<>(new CategoryAxis(), new NumberAxis());
            XYChart.Series<String, Number> a = new XYChart.Series<>();
            a.getData().add(new XYChart.Data<>(null, 1));
            b.getData().add(a);
            return "ok";
        });
        t("setYValue(null) in a bar chart", () -> {
            BarChart<String, Number> b = new BarChart<>(new CategoryAxis(), new NumberAxis());
            XYChart.Series<String, Number> a = new XYChart.Series<>();
            XYChart.Data<String, Number> d = new XYChart.Data<>("a", 1);
            a.getData().add(d);
            b.getData().add(a);
            d.setYValue(null);
            return d.getYValue();
        });
        t("setXValue(null) in a line chart", () -> {
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), new NumberAxis());
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
            a.getData().add(d);
            c.getData().add(a);
            d.setXValue(null);
            d.setYValue(5);
            return d;
        });

        // show() with a null value in each kind of chart, in a window of its own.
        for (String kind : new String[] { "line", "bar", "scatter" }) {
            for (boolean catX : new boolean[] { false, true }) {
                if (kind.equals("bar") && !catX) {
                    continue;
                }
                for (String which : new String[] { "x", "y", "none" }) {
                    t(kind + " chart, category x " + catX + ", null " + which, () -> {
                        XYChart c = make(kind, catX);
                        XYChart.Series s1 = new XYChart.Series();
                        Object good = catX ? "A" : (Object) 1;
                        s1.getData().add(new XYChart.Data(good, 2));
                        s1.getData().add(which.equals("x") ? new XYChart.Data(null, 3) : which.equals("y") ? new XYChart.Data(catX ? "B" : (Object) 2, null) : new XYChart.Data(catX ? "C" : (Object) 3, 4));
                        XYChart.Series s2 = new XYChart.Series();
                        s2.getData().add(new XYChart.Data(catX ? "D" : (Object) 7, 8));
                        s2.getData().add(new XYChart.Data(good, 9));
                        c.getData().addAll(s1, s2);
                        Stage st = new Stage();
                        st.setScene(new Scene(new VBox(c), 300, 200));
                        String before = catX ? ((CategoryAxis) c.getXAxis()).getCategories().toString() : "";
                        try {
                            st.show();
                        } finally {
                            p("   categories before " + before + " after " + (catX ? ((CategoryAxis) c.getXAxis()).getCategories() : "") + " showing " + st.isShowing());
                            st.hide();
                        }
                        return "shown";
                    });
                }
            }
        }
        t("a category that isn't in the list given", () -> {
            CategoryAxis cx = new CategoryAxis(FXCollections.observableArrayList("Jan", "Feb"));
            BarChart<String, Number> b = new BarChart<>(cx, new NumberAxis());
            XYChart.Series<String, Number> a = new XYChart.Series<>();
            a.getData().addAll(new XYChart.Data<>("Jan", 5), new XYChart.Data<>("Mar", 7), new XYChart.Data<>("Feb", 2));
            b.getData().add(a);
            Stage st = new Stage();
            st.setScene(new Scene(new VBox(b), 300, 200));
            st.show();
            String r = cx.getCategories() + " auto " + cx.isAutoRanging();
            st.hide();
            return r;
        });
        t("a fixed number axis after show", () -> {
            NumberAxis ny = new NumberAxis(0, 50, 10);
            LineChart<Number, Number> c = new LineChart<>(new NumberAxis(), ny);
            XYChart.Series<Number, Number> a = new XYChart.Series<>();
            a.getData().addAll(new XYChart.Data<>(1, 5), new XYChart.Data<>(2, 7));
            c.getData().add(a);
            Stage st = new Stage();
            st.setScene(new Scene(new VBox(c), 300, 200));
            st.show();
            String r = ny.getLowerBound() + " " + ny.getUpperBound() + " " + ny.getTickUnit() + " " + a.getName();
            st.hide();
            return r;
        });

        // The window: one chart of each kind.
        NumberAxis years = new NumberAxis("Year", 2000, 2020, 5);
        NumberAxis people = new NumberAxis();
        people.setLabel("People");
        LineChart<Number, Number> line = new LineChart<>(years, people);
        line.setTitle("Cities");
        line.setCreateSymbols(false);
        XYChart.Series<Number, Number> helsinki = new XYChart.Series<>();
        helsinki.setName("Helsinki");
        helsinki.getData().addAll(new XYChart.Data<>(2000, 555), new XYChart.Data<>(2005, 560.5), new XYChart.Data<>(2010, 588));
        XYChart.Series<Number, Number> turku = new XYChart.Series<>("Turku", FXCollections.observableArrayList(new XYChart.Data<>(2000, 172L), new XYChart.Data<>(2010, 1.5e7)));
        line.getData().addAll(helsinki, turku);

        BarChart<String, Number> bars = new BarChart<>(new CategoryAxis(), new NumberAxis());
        bars.setLegendVisible(false);
        XYChart.Series<String, Number> votes = new XYChart.Series<>();
        votes.getData().addAll(new XYChart.Data<>("Yes", 12), new XYChart.Data<>("No", 7.25f), new XYChart.Data<>("Maybe \"so\"", 0));
        bars.getData().add(votes);

        ScatterChart<Number, Number> dots = new ScatterChart<>(new NumberAxis(-1, 1, 0.25), new NumberAxis(0, 10, 2.5));
        dots.setTitle("");
        XYChart.Series<Number, Number> pts = new XYChart.Series<>();
        pts.setName("points");
        for (int i = 0; i < 6; i++) {
            pts.getData().add(new XYChart.Data<>(i / 10.0 - 0.3, i * i / 3.0));
        }
        dots.getData().addAll(pts, new XYChart.Series<>());

        Label status = new Label("ready");
        Button add = new Button("Add");
        add.setOnAction(e -> {
            helsinki.getData().add(new XYChart.Data<>(2015, 620));
            votes.getData().get(0).setYValue(13);
            pts.getData().remove(0);
            status.setText("added: " + helsinki.getData().size() + " " + votes.getData().get(0));
        });
        Button rename = new Button("Rename");
        rename.setOnAction(e -> {
            line.setTitle(null);
            helsinki.setName("Espoo");
            dots.setLegendVisible(false);
            line.setCreateSymbols(true);
            years.setLabel(null);
            years.setUpperBound(2030);
            status.setText("renamed");
        });
        Button clear = new Button("Clear");
        clear.setOnAction(e -> {
            line.getData().clear();
            bars.setData(FXCollections.observableArrayList());
            status.setText("cleared");
        });
        VBox root = new VBox(new HBox(add, rename, clear), status, line, bars, dots);
        stage.setScene(new Scene(root));
        stage.setTitle("Charts");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
