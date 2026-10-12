// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.shape;

import arena.fx.ObservableArrayList;
import javafx.collections.ObservableList;

/**
 * A closed shape through its points, given as x and y one after the other:
 * new Polygon(0, -10, 10, 10, -10, 10) is a triangle around (0, 0). Move it with setTranslateX and
 * setTranslateY and turn it with setRotate.
 */
public class Polygon extends Shape {
    private final ObservableArrayList<Double> points = new ObservableArrayList<Double>();

    public Polygon() {
    }

    public Polygon(double... points) {
        if (points != null) {
            for (double p : points) {
                this.points.add(p);
            }
        }
    }

    {
        // A change to the points changes the polygon's outline.
        points.addHook(new ObservableArrayList.Hook<Double>() {
            @Override
            public void changed(ObservableArrayList<Double> list, java.util.List<Double> added, java.util.List<Double> removed) {
                arena.fx.Frames.reshaped(Polygon.this);
            }
        });
    }

    /** The points: x and y one after the other (a last x without its y is left out). */
    public final ObservableList<Double> getPoints() {
        return points;
    }

    @Override
    public String toString() {
        return "Polygon[" + idText() + "points=" + points + ", fill=" + getFill() + strokeText() + "]";
    }
}
