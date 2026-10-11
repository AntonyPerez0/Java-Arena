// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.shape;

import javafx.scene.paint.Color;

/**
 * A shape made of path elements. In Java Arena a Path is what Shape.intersect gives: the area two
 * shapes have in common, of which it knows the box around it (getBoundsInLocal()), not the
 * elements; new Path() is empty.
 */
public class Path extends Shape {
    static {
        arena.fx.Geometry.registerPaths(new arena.fx.Geometry.Paths() {
            @Override
            public float[] box(Path path) {
                return path.box;
            }

            @Override
            public javafx.geometry.Bounds bounds(Path path) {
                if (path.bounds == null) {
                    path.bounds = arena.fx.Geometry.boundsOf(path.box);
                }
                return path.bounds;
            }
        });
    }

    /** { minX, minY, maxX, maxY } of the area, or null when it is empty. */
    private final float[] box;
    /** Its bounds, made when first asked for. */
    private javafx.geometry.Bounds bounds;

    public Path() {
        setFill(null);
        setStroke(Color.BLACK);
        box = null;
    }

    private Path(float[] box) {
        // As JavaFX makes the result of intersect: filled black, no stroke.
        this.box = box;
    }

    static Path result(float[] box) {
        return new Path(box);
    }
}
