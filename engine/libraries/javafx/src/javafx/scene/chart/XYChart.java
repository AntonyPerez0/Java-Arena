// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

import arena.fx.Charts;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;

/**
 * A chart with an x axis and a y axis, and series of data points: getData().add(series). The checks
 * are JavaFX's: adding a series that is already in the chart (or null), or a data point already in
 * the series (or null), stays done, and the exception JavaFX's list listener throws goes to the
 * thread's uncaught exception handler; a list with one twice given to setData or to a Series throws.
 * A data point whose value is null makes the chart fail when its window shows, as in JavaFX.
 */
public abstract class XYChart<X, Y> extends Chart {
    private final Axis<X> xAxis;
    private final Axis<Y> yAxis;
    private ObservableList<Series<X, Y>> data;

    XYChart(Axis<X> xAxis, Axis<Y> yAxis) {
        Charts.checkAxes(xAxis, yAxis);
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        setData(FXCollections.<Series<X, Y>>observableArrayList());
    }

    public Axis<X> getXAxis() {
        return xAxis;
    }

    public Axis<Y> getYAxis() {
        return yAxis;
    }

    /** The series, in the order they are drawn (null after setData(null)). */
    public final ObservableList<Series<X, Y>> getData() {
        return data;
    }

    /** Shows these series (the list itself, which may change later). */
    public final void setData(ObservableList<Series<X, Y>> value) {
        Charts.setData(this, data, value);
        data = value;
    }

    /** A series of data points, with a name (shown in the legend). */
    public static final class Series<X, Y> {
        private String name;
        private ObservableList<Data<X, Y>> data;

        /** A series with no name and no data yet. */
        public Series() {
            this(FXCollections.<Data<X, Y>>observableArrayList());
        }

        /** A series of these data points. */
        public Series(ObservableList<Data<X, Y>> data) {
            this(null, data);
        }

        /** A series with a name and these data points. */
        public Series(String name, ObservableList<Data<X, Y>> data) {
            Charts.checkNewSeriesData(data);
            setName(name);
            setData(data);
        }

        public final void setName(String value) {
            name = value;
        }

        public final String getName() {
            return name;
        }

        /** The data points, in order (null after setData(null)). */
        public final ObservableList<Data<X, Y>> getData() {
            return data;
        }

        /** Shows these data points (the list itself, which may change later). */
        public final void setData(ObservableList<Data<X, Y>> value) {
            Charts.setSeriesData(this, data, value);
            data = value;
        }

        @Override
        public String toString() {
            return "Series[" + getName() + "]";
        }
    }

    /** A data point: an x value and a y value (a number, or a category's text on a CategoryAxis). */
    public static final class Data<X, Y> {
        private X xValue;
        private Y yValue;

        /** A data point with no values yet. */
        public Data() {
        }

        public Data(X xValue, Y yValue) {
            this.xValue = xValue;
            this.yValue = yValue;
        }

        public final X getXValue() {
            return xValue;
        }

        public final void setXValue(X value) {
            xValue = value;
            Charts.valueChanged(this, true);
        }

        public final Y getYValue() {
            return yValue;
        }

        public final void setYValue(Y value) {
            yValue = value;
            Charts.valueChanged(this, false);
        }

        @Override
        public String toString() {
            return "Data[" + getXValue() + "," + getYValue() + ",null]";
        }
    }
}
