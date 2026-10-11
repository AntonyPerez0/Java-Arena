// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.chart;

import arena.fx.Charts;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;

/**
 * An axis of categories (texts). new CategoryAxis() takes the categories from the data, in the order
 * they first appear, when its window shows; given a list, it shows those categories in that order
 * (a data point whose category isn't in it isn't drawn), as in JavaFX.
 */
public final class CategoryAxis extends Axis<String> {
    private ObservableList<String> categories = FXCollections.observableArrayList();

    /** An axis that takes its categories from the data. */
    public CategoryAxis() {
        Charts.watchCategories(categories);
    }

    /** An axis of these categories, in this order (the list itself, which may change later). */
    public CategoryAxis(ObservableList<String> categories) {
        Charts.checkCategories(categories);
        this.categories = categories;
        Charts.watchCategories(categories);
        setAutoRanging(false);
    }

    /** The categories (the list given to the constructor, or the one the data filled). */
    public final ObservableList<String> getCategories() {
        return categories;
    }
}
