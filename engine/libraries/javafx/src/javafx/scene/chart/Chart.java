// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

import javafx.scene.layout.Region;

/** A chart: a title, a legend and what it plots. Java Arena records it and the page draws it. */
public abstract class Chart extends Region {
    private String title;
    private boolean legendVisible = true;
    private boolean animated = true;

    Chart() {
    }

    /** The title above the chart (null: none, the default). */
    public final void setTitle(String value) {
        title = value;
    }

    public final String getTitle() {
        return title;
    }

    /** Whether the legend (the series' names) shows; true by default. */
    public final void setLegendVisible(boolean value) {
        legendVisible = value;
    }

    public final boolean isLegendVisible() {
        return legendVisible;
    }

    /** Whether changes animate (recorded only: the page doesn't animate). */
    public final void setAnimated(boolean value) {
        animated = value;
    }

    public final boolean getAnimated() {
        return animated;
    }
}
