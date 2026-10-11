// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

/** A chart of points, one symbol per data point. */
public class ScatterChart<X, Y> extends XYChart<X, Y> {
    public ScatterChart(Axis<X> xAxis, Axis<Y> yAxis) {
        super(xAxis, yAxis);
    }
}
