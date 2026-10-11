// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

import arena.fx.Charts;

/** A chart of bars: one axis must be a CategoryAxis and the other a NumberAxis. The series' bars stand side by side in each category. */
public class BarChart<X, Y> extends XYChart<X, Y> {
    public BarChart(Axis<X> xAxis, Axis<Y> yAxis) {
        super(xAxis, yAxis);
        Charts.checkBarAxes(xAxis, yAxis);
    }
}
