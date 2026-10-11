// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

/**
 * An axis of numbers from a lower to an upper bound. An auto-ranging axis keeps the bounds a program
 * set here: Java Arena doesn't lay charts out, and the page works out the range it draws.
 */
public abstract class ValueAxis<T extends Number> extends Axis<T> {
    private double lowerBound;
    private double upperBound = 100;
    private boolean minorTickVisible = true;

    ValueAxis() {
    }

    public final void setLowerBound(double value) {
        lowerBound = value;
    }

    public final double getLowerBound() {
        return lowerBound;
    }

    public final void setUpperBound(double value) {
        upperBound = value;
    }

    public final double getUpperBound() {
        return upperBound;
    }

    /** Whether the small ticks between the numbered ones show (recorded for the drawing). */
    public final void setMinorTickVisible(boolean value) {
        minorTickVisible = value;
    }

    public final boolean isMinorTickVisible() {
        return minorTickVisible;
    }
}
