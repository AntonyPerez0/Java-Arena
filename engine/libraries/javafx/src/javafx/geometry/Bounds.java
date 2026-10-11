// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.geometry;

/**
 * A rectangular box: where a node is (getBoundsInLocal, getBoundsInParent) or what Shape.intersect
 * covers. Its depth (z) is 0 here. An empty box has a negative width or height: JavaFX's empty
 * bounds have width and height -1, which is what Shape.intersect gives when the shapes don't overlap.
 */
public abstract class Bounds {
    private final double minX;
    private final double minY;
    private final double minZ;
    private final double width;
    private final double height;
    private final double depth;
    private final double maxX;
    private final double maxY;
    private final double maxZ;

    protected Bounds(double minX, double minY, double minZ, double width, double height, double depth) {
        this.minX = minX;
        this.minY = minY;
        this.minZ = minZ;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.maxX = minX + width;
        this.maxY = minY + height;
        this.maxZ = minZ + depth;
    }

    public final double getMinX() {
        return minX;
    }

    public final double getMinY() {
        return minY;
    }

    public final double getMinZ() {
        return minZ;
    }

    public final double getWidth() {
        return width;
    }

    public final double getHeight() {
        return height;
    }

    public final double getDepth() {
        return depth;
    }

    public final double getMaxX() {
        return maxX;
    }

    public final double getMaxY() {
        return maxY;
    }

    public final double getMaxZ() {
        return maxZ;
    }

    public final double getCenterX() {
        return (getMaxX() + getMinX()) * 0.5;
    }

    public final double getCenterY() {
        return (getMaxY() + getMinY()) * 0.5;
    }

    public final double getCenterZ() {
        return (getMaxZ() + getMinZ()) * 0.5;
    }

    /** Whether the box is empty: a max below its min (a negative width, height or depth). */
    public abstract boolean isEmpty();

    /** Whether the point is in the box (on its edges counts). */
    public abstract boolean contains(double x, double y);

    public abstract boolean contains(Point2D p);

    /** Whether the whole box is in this one. */
    public abstract boolean contains(Bounds b);

    public abstract boolean contains(double x, double y, double w, double h);

    /** Whether the two boxes have a point in common (touching edges count). */
    public abstract boolean intersects(Bounds b);

    public abstract boolean intersects(double x, double y, double w, double h);
}
