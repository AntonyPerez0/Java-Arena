// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

import javafx.scene.layout.Region;

/** An axis of a chart: its label, and whether it works its range out from the data (auto-ranging). */
public abstract class Axis<T> extends Region {
    private String label;
    private boolean autoRanging = true;

    Axis() {
    }

    public final void setLabel(String value) {
        label = value;
    }

    public final String getLabel() {
        return label;
    }

    /** Whether the axis works its range out from the data (true unless the bounds or categories were given). */
    public final void setAutoRanging(boolean value) {
        autoRanging = value;
    }

    public final boolean isAutoRanging() {
        return autoRanging;
    }
}
