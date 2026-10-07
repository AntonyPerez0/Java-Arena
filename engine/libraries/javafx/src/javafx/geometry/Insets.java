// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.geometry;

/** The space around the inside edges of a region: top, right, bottom and left. */
public class Insets {
    /** No space on any side. */
    public static final Insets EMPTY = new Insets(0, 0, 0, 0);

    private final double top;
    private final double right;
    private final double bottom;
    private final double left;

    /** The same space on all four sides. */
    public Insets(double topRightBottomLeft) {
        this(topRightBottomLeft, topRightBottomLeft, topRightBottomLeft, topRightBottomLeft);
    }

    public Insets(double top, double right, double bottom, double left) {
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.left = left;
    }

    public final double getTop() {
        return top;
    }

    public final double getRight() {
        return right;
    }

    public final double getBottom() {
        return bottom;
    }

    public final double getLeft() {
        return left;
    }

    /** Equal when all four sides are equal (compared with ==, as JavaFX does). */
    @Override
    public boolean equals(Object other) {
        if (other == this) {
            return true;
        }
        if (!(other instanceof Insets)) {
            return false;
        }
        Insets o = (Insets) other;
        return top == o.top && right == o.right && bottom == o.bottom && left == o.left;
    }

    /** The same hash code JavaFX 21 gives. */
    @Override
    public int hashCode() {
        long bits = 17L;
        bits = 37L * bits + Double.doubleToLongBits(top);
        bits = 37L * bits + Double.doubleToLongBits(right);
        bits = 37L * bits + Double.doubleToLongBits(bottom);
        bits = 37L * bits + Double.doubleToLongBits(left);
        return (int) (bits ^ (bits >> 32));
    }

    @Override
    public String toString() {
        return "Insets [top=" + top + ", right=" + right + ", bottom=" + bottom + ", left=" + left + "]";
    }
}
