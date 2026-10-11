// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

/** An axis of numbers. new NumberAxis() works its range out from the data; the others go from lowerBound to upperBound. */
public final class NumberAxis extends ValueAxis<Number> {
    private double tickUnit = 5;
    private boolean forceZeroInRange = true;

    /** An auto-ranging axis (its range comes from the data, with 0 in it). */
    public NumberAxis() {
    }

    /** An axis from lowerBound to upperBound, with a numbered tick every tickUnit. */
    public NumberAxis(double lowerBound, double upperBound, double tickUnit) {
        setAutoRanging(false);
        setLowerBound(lowerBound);
        setUpperBound(upperBound);
        setTickUnit(tickUnit);
    }

    /** An axis with a label, from lowerBound to upperBound, with a numbered tick every tickUnit. */
    public NumberAxis(String axisLabel, double lowerBound, double upperBound, double tickUnit) {
        this(lowerBound, upperBound, tickUnit);
        setLabel(axisLabel);
    }

    public final void setTickUnit(double value) {
        tickUnit = value;
    }

    public final double getTickUnit() {
        return tickUnit;
    }

    /** Whether an auto-ranging axis includes 0 (true by default). */
    public final void setForceZeroInRange(boolean value) {
        forceZeroInRange = value;
    }

    public final boolean isForceZeroInRange() {
        return forceZeroInRange;
    }
}
