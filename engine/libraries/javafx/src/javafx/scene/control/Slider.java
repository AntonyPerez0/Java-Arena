// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.control;

import arena.fx.OwnedDoubleProperty;
import javafx.beans.property.DoubleProperty;

/**
 * A slider: a value between min and max that the user moves with a thumb. As in JavaFX the value
 * stays between min and max (setting one outside moves it to the nearest end), a min above max
 * raises max to it, and a max below min lowers min to it. The tick settings are recorded for the
 * drawing; snapToTicks applies when the user moves the slider (the set Slider event), not to setValue.
 */
public class Slider extends Control {
    private double min;
    private double max = 100;
    private final OwnedDoubleProperty value = new OwnedDoubleProperty(this, "value", 0) {
        @Override
        protected void invalidated() {
            keepInRange();
        }
    };
    private boolean showTickLabels;
    private boolean showTickMarks;
    private double majorTickUnit = 25;
    private int minorTickCount = 3;
    private double blockIncrement = 10;
    private boolean snapToTicks;

    /** A slider from 0 to 100 at 0. */
    public Slider() {
    }

    public Slider(double min, double max, double value) {
        setMax(max);
        setMin(min);
        setValue(value);
    }

    private void keepInRange() {
        double v = value.get();
        if (v < min || v > max) {
            value.set(v < min ? min : max);
        }
    }

    public final void setMin(double v) {
        if (min != v) {
            min = v;
            if (min > max) {
                setMax(min);
            }
            keepInRange();
        }
    }

    public final double getMin() {
        return min;
    }

    public final void setMax(double v) {
        if (max != v) {
            max = v;
            if (max < min) {
                setMin(max);
            }
            keepInRange();
        }
    }

    public final double getMax() {
        return max;
    }

    /** Sets the value (kept between min and max). */
    public final void setValue(double v) {
        value.set(v);
    }

    public final double getValue() {
        return value.get();
    }

    /** The value as a property that listeners can follow (they get Numbers). */
    public final DoubleProperty valueProperty() {
        return value;
    }

    public final void setShowTickLabels(boolean v) {
        showTickLabels = v;
    }

    public final boolean isShowTickLabels() {
        return showTickLabels;
    }

    public final void setShowTickMarks(boolean v) {
        showTickMarks = v;
    }

    public final boolean isShowTickMarks() {
        return showTickMarks;
    }

    /** The distance between the major ticks (above 0; default 25). */
    public final void setMajorTickUnit(double v) {
        if (v <= 0) {
            throw new IllegalArgumentException("MajorTickUnit cannot be less than or equal to 0.");
        }
        majorTickUnit = v;
    }

    public final double getMajorTickUnit() {
        return majorTickUnit;
    }

    /** How many minor ticks there are between two major ones (default 3). */
    public final void setMinorTickCount(int v) {
        minorTickCount = v;
    }

    public final int getMinorTickCount() {
        return minorTickCount;
    }

    /** How far the arrow keys move the slider (recorded; default 10). */
    public final void setBlockIncrement(double v) {
        blockIncrement = v;
    }

    public final double getBlockIncrement() {
        return blockIncrement;
    }

    /** Whether the slider moves to the nearest tick when the user lets it go. */
    public final void setSnapToTicks(boolean v) {
        snapToTicks = v;
    }

    public final boolean isSnapToTicks() {
        return snapToTicks;
    }
}
