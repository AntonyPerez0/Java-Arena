// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

/** A chart that joins each series' points with lines, with a symbol at each point unless setCreateSymbols(false). */
public class LineChart<X, Y> extends XYChart<X, Y> {
    private boolean createSymbols = true;

    public LineChart(Axis<X> xAxis, Axis<Y> yAxis) {
        super(xAxis, yAxis);
    }

    /** Whether each point gets a symbol (true by default). */
    public final void setCreateSymbols(boolean value) {
        createSymbols = value;
    }

    public final boolean getCreateSymbols() {
        return createSymbols;
    }
}
