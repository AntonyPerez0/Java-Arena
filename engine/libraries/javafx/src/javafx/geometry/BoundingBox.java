// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.geometry;

/** A box given by its corner and size, as JavaFX writes it: BoundingBox [minX:0.0, minY:0.0, minZ:0.0, width:10.0, ...]. */
public class BoundingBox extends Bounds {
    public BoundingBox(double minX, double minY, double width, double height) {
        this(minX, minY, 0, width, height, 0);
    }

    public BoundingBox(double minX, double minY, double minZ, double width, double height, double depth) {
        super(minX, minY, minZ, width, height, depth);
    }

    @Override
    public boolean isEmpty() {
        return getMaxX() < getMinX() || getMaxY() < getMinY() || getMaxZ() < getMinZ();
    }

    @Override
    public boolean contains(Point2D p) {
        if (p == null) {
            return false;
        }
        return contains(p.getX(), p.getY());
    }

    @Override
    public boolean contains(double x, double y) {
        if (isEmpty()) {
            return false;
        }
        return x >= getMinX() && x <= getMaxX() && y >= getMinY() && y <= getMaxY() && 0 >= getMinZ() && 0 <= getMaxZ();
    }

    @Override
    public boolean contains(Bounds b) {
        if (b == null || b.isEmpty()) {
            return false;
        }
        return contains(b.getMinX(), b.getMinY(), b.getWidth(), b.getHeight()) && b.getMinZ() >= getMinZ() && b.getMaxZ() <= getMaxZ();
    }

    @Override
    public boolean contains(double x, double y, double w, double h) {
        return contains(x, y) && contains(x + w, y + h);
    }

    @Override
    public boolean intersects(Bounds b) {
        if (b == null || b.isEmpty()) {
            return false;
        }
        return intersects(b.getMinX(), b.getMinY(), b.getWidth(), b.getHeight()) && b.getMaxZ() >= getMinZ() && b.getMinZ() <= getMaxZ();
    }

    @Override
    public boolean intersects(double x, double y, double w, double h) {
        if (isEmpty() || w < 0 || h < 0) {
            return false;
        }
        return x + w >= getMinX() && y + h >= getMinY() && 0 >= getMinZ() && x <= getMaxX() && y <= getMaxY() && 0 <= getMaxZ();
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == this) {
            return true;
        }
        if (obj instanceof BoundingBox) {
            BoundingBox o = (BoundingBox) obj;
            return getMinX() == o.getMinX() && getMinY() == o.getMinY() && getMinZ() == o.getMinZ() && getWidth() == o.getWidth() && getHeight() == o.getHeight() && getDepth() == o.getDepth();
        }
        return false;
    }

    @Override
    public int hashCode() {
        long bits = 7L;
        bits = 31L * bits + Double.doubleToLongBits(getMinX());
        bits = 31L * bits + Double.doubleToLongBits(getMinY());
        bits = 31L * bits + Double.doubleToLongBits(getMinZ());
        bits = 31L * bits + Double.doubleToLongBits(getWidth());
        bits = 31L * bits + Double.doubleToLongBits(getHeight());
        bits = 31L * bits + Double.doubleToLongBits(getDepth());
        return (int) (bits ^ (bits >> 32));
    }

    @Override
    public String toString() {
        return "BoundingBox [minX:" + getMinX() + ", minY:" + getMinY() + ", minZ:" + getMinZ() + ", width:" + getWidth() + ", height:" + getHeight() + ", depth:" + getDepth() + ", maxX:" + getMaxX() + ", maxY:" + getMaxY() + ", maxZ:" + getMaxZ() + "]";
    }
}
