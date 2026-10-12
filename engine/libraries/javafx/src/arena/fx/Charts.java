// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import javafx.collections.ObservableList;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.chart.Axis;
import javafx.scene.chart.BarChart;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.stage.Window;

/**
 * What JavaFX's charts check, with JavaFX's exceptions and messages (checked against OpenJFX
 * 21.0.12), and the part of a chart's layout a program can see: an auto-ranging CategoryAxis takes
 * its categories from the data, and a data point with a null value makes the layout fail (show()
 * throws when the window shows; after that, the exception goes to the uncaught exception handler at
 * the end of the event, where JavaFX's next pulse would lay the chart out, and the chart isn't laid
 * out again). Java Arena lays a chart out when its window shows and after each event.
 */
public final class Charts {
    /** Which chart each series is in, and which series each data point is in (as JavaFX keeps them). */
    private static final IdentityHashMap<Object, XYChart<?, ?>> CHART_OF = new IdentityHashMap<Object, XYChart<?, ?>>();
    private static final IdentityHashMap<Object, XYChart.Series<?, ?>> SERIES_OF = new IdentityHashMap<Object, XYChart.Series<?, ?>>();
    /** Charts whose layout failed, which JavaFX doesn't lay out again. */
    private static final IdentityHashMap<Object, Boolean> BROKEN = new IdentityHashMap<Object, Boolean>();

    private static final String NULL_NUMBER = "Cannot invoke \"java.lang.Number.doubleValue()\" because \"<local3>\" is null";
    private static final String NULL_CATEGORY = "Cannot invoke \"String.equals(Object)\" because the return value of \"javafx.collections.ObservableList.get(int)\" is null";

    private Charts() {
    }

    private static String hash() {
        return Integer.toHexString(System.identityHashCode(new Object()));
    }

    // ------------------------------------------------------------------ axes

    public static void checkAxes(Axis<?> x, Axis<?> y) {
        // A chart is being made: from now on the windows' charts are laid out after each event.
        anyChart = true;
        if (x == null) {
            throw new NullPointerException("Cannot invoke \"javafx.scene.chart.Axis.getSide()\" because \"<parameter1>\" is null");
        }
        if (y == null) {
            throw new NullPointerException("Cannot invoke \"javafx.scene.chart.Axis.getSide()\" because \"<parameter2>\" is null");
        }
        if (x == y) {
            throw new IllegalArgumentException("Children: duplicate children added: parent = Chart$1@" + hash() + "[styleClass=chart-content]");
        }
    }

    public static void checkBarAxes(Axis<?> x, Axis<?> y) {
        if (!((x instanceof CategoryAxis && y instanceof NumberAxis) || (x instanceof NumberAxis && y instanceof CategoryAxis))) {
            throw new IllegalArgumentException("Axis type incorrect, one of X,Y should be CategoryAxis and the other NumberAxis");
        }
    }

    // ------------------------------------------------------------------ categories

    public static void checkCategories(ObservableList<String> categories) {
        if (categories == null) {
            throw new NullPointerException("Cannot invoke \"java.util.Collection.toArray()\" because \"c\" is null");
        }
        for (int i = 0; i < categories.size(); i++) {
            String c = categories.get(i);
            for (int j = 0; j < i; j++) {
                if (c == null ? categories.get(j) == null : c.equals(categories.get(j))) {
                    throw new IllegalArgumentException("Duplicate category added; " + c + " already present");
                }
            }
        }
    }

    public static void watchCategories(ObservableList<String> categories) {
        if (categories instanceof ObservableArrayList) {
            ((ObservableArrayList<String>) categories).addHook(new ObservableArrayList.Hook<String>() {
                @Override
                public void changed(ObservableArrayList<String> list, List<String> added, List<String> removed) {
                    for (String c : added) {
                        if (c == null) {
                            throw new NullPointerException(NULL_CATEGORY);
                        }
                        int first = list.indexOf(c);
                        int last = list.lastIndexOf(c);
                        if (first != last) {
                            if (added.size() > 1) {
                                throw new IllegalArgumentException("Duplicate category ; " + c + " already present");
                            }
                            // JavaFX refuses the category it already has.
                            list.removeQuietly(last);
                            throw new UnsupportedOperationException();
                        }
                    }
                }
            });
        }
    }

    // ------------------------------------------------------------------ series and data

    private static int count(List<?> list, Object item) {
        int n = 0;
        for (Object o : list) {
            if (o == item) {
                n++;
            }
        }
        return n;
    }

    /** Whether an item (not null) is in the list more than once: one pass, so adding n points one by one stays quick. */
    private static boolean hasTwice(List<?> list) {
        IdentityHashMap<Object, Boolean> seen = new IdentityHashMap<Object, Boolean>();
        for (Object o : list) {
            if (o != null && seen.put(o, Boolean.TRUE) != null) {
                return true;
            }
        }
        return false;
    }

    /**
     * How many times each item (not null) is in a series' data list, by identity, and how many
     * items are in it twice or more, kept up to date with each change, so adding or removing one
     * point costs the same however many the series has (JavaFX checks the whole list on each
     * change, which the browser's engine would make slow for a thousand points added one by one).
     */
    private static final class Counts {
        private final IdentityHashMap<Object, int[]> counts = new IdentityHashMap<Object, int[]>();
        private int twice;

        Counts(List<?> list) {
            for (Object o : list) {
                add(o);
            }
        }

        void add(Object o) {
            if (o == null) {
                return;
            }
            int[] c = counts.get(o);
            if (c == null) {
                counts.put(o, new int[] {1});
            } else if (++c[0] == 2) {
                twice++;
            }
        }

        void remove(Object o) {
            int[] c = o == null ? null : counts.get(o);
            if (c == null) {
                return;
            }
            if (--c[0] == 0) {
                counts.remove(o);
            } else if (c[0] == 1) {
                twice--;
            }
        }

        boolean contains(Object o) {
            return o != null && counts.containsKey(o);
        }

        boolean hasTwice() {
            return twice > 0;
        }
    }

    /** The counts of each series' data list that the library follows (a list FXCollections made). */
    private static final IdentityHashMap<Object, Counts> COUNTS = new IdentityHashMap<Object, Counts>();

    private static synchronized Counts countsOf(Object series) {
        return COUNTS.get(series);
    }

    private static synchronized void setCounts(Object series, Counts counts) {
        if (counts == null) {
            COUNTS.remove(series);
        } else {
            COUNTS.put(series, counts);
        }
    }

    /** Whether a series' data list has this point (by identity), from its counts when the library follows the list. */
    private static boolean seriesHas(XYChart.Series<?, ?> series, Object d) {
        Counts counts = countsOf(series);
        return counts != null ? counts.contains(d) : containsSame(series.getData(), d);
    }

    public static synchronized XYChart<?, ?> chartOf(XYChart.Series<?, ?> series) {
        return CHART_OF.get(series);
    }

    private static synchronized XYChart.Series<?, ?> seriesOf(XYChart.Data<?, ?> data) {
        return SERIES_OF.get(data);
    }

    private static synchronized void setChart(Object series, XYChart<?, ?> chart) {
        if (chart == null) {
            CHART_OF.remove(series);
        } else {
            CHART_OF.put(series, chart);
        }
    }

    private static synchronized void setSeries(Object data, XYChart.Series<?, ?> series) {
        if (series == null) {
            SERIES_OF.remove(data);
        } else {
            SERIES_OF.put(data, series);
        }
    }

    /** XYChart.setData: the old list is let go, the new one followed. */
    public static <X, Y> void setData(final XYChart<X, Y> chart, ObservableList<XYChart.Series<X, Y>> old, ObservableList<XYChart.Series<X, Y>> value) {
        if (value != null && hasTwice(value)) {
            throw new IllegalArgumentException("Duplicate series added");
        }
        if (old instanceof ObservableArrayList) {
            ((ObservableArrayList<XYChart.Series<X, Y>>) old).removeHook(seriesHook(chart));
        }
        if (old != null) {
            for (XYChart.Series<X, Y> s : old) {
                if (s != null && chartOf(s) == chart) {
                    setChart(s, null);
                }
            }
        }
        if (value != null) {
            for (XYChart.Series<X, Y> s : value) {
                if (s != null) {
                    setChart(s, chart);
                }
            }
        }
        if (value instanceof ObservableArrayList) {
            ((ObservableArrayList<XYChart.Series<X, Y>>) value).addHook(seriesHook(chart));
        }
    }

    private static final IdentityHashMap<Object, ObservableArrayList.Hook<?>> HOOKS = new IdentityHashMap<Object, ObservableArrayList.Hook<?>>();

    @SuppressWarnings("unchecked")
    private static synchronized <X, Y> ObservableArrayList.Hook<XYChart.Series<X, Y>> seriesHook(final XYChart<X, Y> chart) {
        ObservableArrayList.Hook<?> hook = HOOKS.get(chart);
        if (hook == null) {
            hook = new ObservableArrayList.Hook<XYChart.Series<X, Y>>() {
                @Override
                public void changed(ObservableArrayList<XYChart.Series<X, Y>> list, List<XYChart.Series<X, Y>> added, List<XYChart.Series<X, Y>> removed) {
                    for (XYChart.Series<X, Y> s : removed) {
                        if (s != null && !containsSame(list, s) && chartOf(s) == chart) {
                            setChart(s, null);
                        }
                    }
                    for (XYChart.Series<X, Y> s : added) {
                        if (s == null) {
                            throw new NullPointerException("Cannot read field \"setToRemove\" because \"<local5>\" is null");
                        }
                        if (count(list, s) > 1) {
                            throw new IllegalArgumentException("Duplicate series added");
                        }
                        setChart(s, chart);
                        if (chart instanceof BarChart && s.getData() != null) {
                            for (XYChart.Data<X, Y> d : s.getData()) {
                                if (d != null) {
                                    checkBarValue(chart, d);
                                }
                            }
                        }
                    }
                }
            };
            HOOKS.put(chart, hook);
        }
        return (ObservableArrayList.Hook<XYChart.Series<X, Y>>) hook;
    }

    private static boolean containsSame(List<?> list, Object item) {
        return count(list, item) > 0;
    }

    /** A bar chart reads each bar's number when it gets a series: a null one fails, as in JavaFX. */
    private static void checkBarValue(XYChart<?, ?> chart, XYChart.Data<?, ?> d) {
        boolean xIsValue = chart.getXAxis() instanceof NumberAxis;
        if ((xIsValue ? d.getXValue() : d.getYValue()) == null) {
            throw new NullPointerException("Cannot invoke \"java.lang.Number.doubleValue()\" because the return value of \"javafx.scene.chart.XYChart$Data." + (xIsValue ? "getXValue" : "getYValue") + "()\" is null");
        }
    }

    /** new Series(data): the list is read at once. */
    public static void checkNewSeriesData(ObservableList<?> data) {
        if (data == null) {
            throw new NullPointerException("Cannot invoke \"javafx.collections.ObservableList.iterator()\" because \"<parameter1>\" is null");
        }
    }

    /** Series.setData: the old list is let go, the new one followed. */
    public static <X, Y> void setSeriesData(final XYChart.Series<X, Y> series, ObservableList<XYChart.Data<X, Y>> old, ObservableList<XYChart.Data<X, Y>> value) {
        if (value != null && hasTwice(value)) {
            throw new IllegalArgumentException("Duplicate data added");
        }
        if (old instanceof ObservableArrayList) {
            ((ObservableArrayList<XYChart.Data<X, Y>>) old).removeHook(dataHook(series));
        }
        if (old != null) {
            for (XYChart.Data<X, Y> d : old) {
                if (d != null && seriesOf(d) == series) {
                    setSeries(d, null);
                }
            }
        }
        if (value != null) {
            for (XYChart.Data<X, Y> d : value) {
                if (d != null) {
                    setSeries(d, series);
                }
            }
        }
        setCounts(series, value instanceof ObservableArrayList ? new Counts(value) : null);
        if (value instanceof ObservableArrayList) {
            ((ObservableArrayList<XYChart.Data<X, Y>>) value).addHook(dataHook(series));
        }
    }

    @SuppressWarnings("unchecked")
    private static synchronized <X, Y> ObservableArrayList.Hook<XYChart.Data<X, Y>> dataHook(final XYChart.Series<X, Y> series) {
        ObservableArrayList.Hook<?> hook = HOOKS.get(series);
        if (hook == null) {
            hook = new ObservableArrayList.Hook<XYChart.Data<X, Y>>() {
                @Override
                public void changed(ObservableArrayList<XYChart.Data<X, Y>> list, List<XYChart.Data<X, Y>> added, List<XYChart.Data<X, Y>> removed) {
                    // The list has changed already: the counts follow it before anything can throw.
                    Counts counts = countsOf(series);
                    if (counts == null) {
                        counts = new Counts(list);
                        setCounts(series, counts);
                    } else {
                        for (XYChart.Data<X, Y> d : removed) {
                            counts.remove(d);
                        }
                        for (XYChart.Data<X, Y> d : added) {
                            counts.add(d);
                        }
                    }
                    for (XYChart.Data<X, Y> d : removed) {
                        if (d != null && !counts.contains(d) && seriesOf(d) == series) {
                            setSeries(d, null);
                        }
                    }
                    XYChart<?, ?> chart = chartOf(series);
                    // As in JavaFX, the whole list is checked for a point in it twice first (a
                    // duplicate left in it by an earlier add makes every later add fail too).
                    if (counts.hasTwice()) {
                        throw new IllegalArgumentException("Duplicate data added");
                    }
                    for (XYChart.Data<X, Y> d : added) {
                        if (d == null) {
                            throw new NullPointerException(chart == null ? "Cannot invoke \"javafx.scene.chart.XYChart$Data.setSeries(javafx.scene.chart.XYChart$Series)\" because \"<local6>\" is null" : "Cannot read field \"setToRemove\" because \"<local6>\" is null");
                        }
                        setSeries(d, series);
                        if (chart != null && chart.getData() != null) {
                            for (XYChart.Series<?, ?> other : chart.getData()) {
                                if (other != null && other != series && other.getData() != null && seriesHas(other, d)) {
                                    throw new IllegalArgumentException("Children: duplicate children added: parent = Group@" + hash() + "[styleClass=plot-content]");
                                }
                            }
                        }
                    }
                }
            };
            HOOKS.put(series, hook);
        }
        return (ObservableArrayList.Hook<XYChart.Data<X, Y>>) hook;
    }

    /** Data.setXValue and setYValue: a bar chart reads the new number at once. */
    public static void valueChanged(XYChart.Data<?, ?> data, boolean x) {
        XYChart.Series<?, ?> series = seriesOf(data);
        XYChart<?, ?> chart = series == null ? null : chartOf(series);
        if (chart instanceof BarChart && (chart.getXAxis() instanceof NumberAxis) == x) {
            checkBarValue(chart, data);
        }
    }

    // ------------------------------------------------------------------ layout

    /** Lays out the charts of a scene whose window shows (show() throws what fails). */
    public static void layout(Scene scene) {
        if (scene == null) {
            return;
        }
        List<Node> nodes = new ArrayList<Node>();
        collect(scene.getRoot(), nodes);
        for (Node n : nodes) {
            if (n instanceof XYChart) {
                layoutChart((XYChart<?, ?>) n);
            }
        }
    }

    /** Lays out the charts of the showing windows, after an event: what fails goes to the uncaught exception handler. */
    /** Whether a chart was ever made (until then there is nothing to lay out, and each frame skips the walk). */
    private static boolean anyChart;

    static void layoutShowing(List<Window> windows) {
        if (!anyChart) {
            return;
        }
        for (Window w : windows) {
            List<Node> nodes = new ArrayList<Node>();
            if (w.getScene() != null) {
                collect(w.getScene().getRoot(), nodes);
            }
            for (Node n : nodes) {
                if (n instanceof XYChart) {
                    try {
                        layoutChart((XYChart<?, ?>) n);
                    } catch (RuntimeException e) {
                        Session.uncaught(e);
                    }
                }
            }
        }
    }

    private static void collect(Node node, List<Node> out) {
        out.add(node);
        for (Node child : Outline.children(node)) {
            collect(child, out);
        }
    }

    private static synchronized boolean broken(Object chart) {
        return BROKEN.containsKey(chart);
    }

    private static synchronized void breaks(Object chart) {
        BROKEN.put(chart, Boolean.TRUE);
    }

    /**
     * Lays a chart out as JavaFX does in the order a program can see: the numbers of the number
     * axes are read first (x, then y: a null one fails), then an auto-ranging category axis takes
     * its categories from the data (a null category among them), and a null category fails last.
     */
    private static void layoutChart(XYChart<?, ?> chart) {
        if (broken(chart)) {
            return;
        }
        if (!(chart.getXAxis() instanceof CategoryAxis)) {
            checkNulls(chart, true, NULL_NUMBER);
        }
        if (!(chart.getYAxis() instanceof CategoryAxis)) {
            checkNulls(chart, false, NULL_NUMBER);
        }
        fillCategories(chart, chart.getXAxis(), true);
        fillCategories(chart, chart.getYAxis(), false);
        if (chart.getXAxis() instanceof CategoryAxis) {
            checkNulls(chart, true, NULL_CATEGORY);
        }
        if (chart.getYAxis() instanceof CategoryAxis) {
            checkNulls(chart, false, NULL_CATEGORY);
        }
    }

    private static void checkNulls(XYChart<?, ?> chart, boolean x, String message) {
        if (chart.getData() == null) {
            return;
        }
        for (XYChart.Series<?, ?> s : chart.getData()) {
            if (s == null || s.getData() == null) {
                continue;
            }
            for (XYChart.Data<?, ?> d : s.getData()) {
                if (d != null && (x ? d.getXValue() : d.getYValue()) == null) {
                    breaks(chart);
                    throw new NullPointerException(message);
                }
            }
        }
    }

    /** An auto-ranging category axis takes the categories of the data, in the order they first appear. */
    private static void fillCategories(XYChart<?, ?> chart, Axis<?> axis, boolean x) {
        if (!(axis instanceof CategoryAxis) || !axis.isAutoRanging() || chart.getData() == null) {
            return;
        }
        List<String> found = new ArrayList<String>();
        for (XYChart.Series<?, ?> s : chart.getData()) {
            if (s == null || s.getData() == null) {
                continue;
            }
            for (XYChart.Data<?, ?> d : s.getData()) {
                if (d == null) {
                    continue;
                }
                Object v = x ? d.getXValue() : d.getYValue();
                String c = v == null ? null : String.valueOf(v);
                if (!found.contains(c)) {
                    found.add(c);
                }
            }
        }
        ObservableList<String> categories = ((CategoryAxis) axis).getCategories();
        if (!categories.equals(found)) {
            if (categories instanceof ObservableArrayList) {
                ((ObservableArrayList<String>) categories).setAllQuietly(found);
            } else {
                categories.setAll(found);
            }
        }
    }
}
