// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.List;
import javafx.geometry.BoundingBox;
import javafx.geometry.Bounds;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.canvas.Canvas;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.Region;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.shape.Path;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.scene.text.Text;

/**
 * Where nodes are: the transform from a node to its parent (layout, translate, and rotate about the
 * center of the node's own bounds) and the bounds JavaFX gives shapes, worked out as JavaFX 21 does
 * (checked against OpenJFX 21.0.12). JavaFX keeps a shape's outline and its bounds in float
 * precision, so the points are rounded to float as they are placed, and a box's width is the
 * difference of two floats: getBoundsInLocal() of a polygon turned by 45 degrees gives the same
 * digits as there.
 *
 * <ul>
 * <li>Polygon: the box around its points; with a stroke, around the outline of the stroke (miter
 * joins, or bevel joins where a miter would be longer than 10 times half the width) and 0.5 more
 * on every side, as JavaFX gives it.</li>
 * <li>Rectangle: x, y, width and height, half the stroke's width more on every side.</li>
 * <li>Circle: the center plus and minus the radius (and half the stroke's width), also when turned.</li>
 * <li>Line: the box around its ends, half the stroke's width more on every side for a level or
 * upright line, and that times the square root of 2 for a slanted one.</li>
 * <li>Text: an estimate (Java Arena doesn't measure fonts): from the baseline up by 0.93 of the
 * font's size and down by 0.24, and 0.5 of the size wide per character.</li>
 * <li>Path (the result of Shape.intersect): the box around the shared area.</li>
 * <li>Other nodes: Java Arena doesn't lay windows out, so a region is its preferred size (or 0)
 * with its children's bounds in it, a canvas is its size, an image view its image's size, and a
 * control is 0 by 0 at (0, 0).</li>
 * </ul>
 */
public final class Geometry {
    private Geometry() {
    }

    /** Lets the library read the area a Path from Shape.intersect covers (Path registers it). */
    public interface Paths {
        float[] box(Path path);

        /** Its bounds in its own coordinates (made once: a Path from intersect doesn't change). */
        Bounds bounds(Path path);
    }

    private static Paths paths;

    public static synchronized void registerPaths(Paths p) {
        if (paths == null) {
            paths = p;
        }
    }

    /** Set once, when Path is loaded (before any path exists), so read without a lock. */
    private static Paths paths() {
        return paths;
    }

    /** JavaFX's empty bounds. */
    static Bounds empty() {
        return new BoundingBox(0, 0, 0, -1, -1, 0);
    }

    /** JavaFX's empty bounds, one for all: a Bounds never changes. */
    private static final Bounds EMPTY = empty();

    /** The bounds of a float box (null: JavaFX's empty bounds, the same object every time). */
    public static Bounds boundsOf(float[] box) {
        return box == null ? EMPTY : bounds(box);
    }

    /** The bounds of a float box { minX, minY, maxX, maxY } (null: empty), its width the difference of the floats. */
    static Bounds bounds(float[] box) {
        if (box == null) {
            return empty();
        }
        float width = box[2] - box[0];
        float height = box[3] - box[1];
        return new BoundingBox(box[0], box[1], 0, width, height, 0);
    }

    // ------------------------------------------------------------------ the transform

    /**
     * The transform from the node's coordinates to its parent's, as { mxx, mxy, mxt, myx, myy, myt }
     * (x' = mxx * x + mxy * y + mxt): a translation by layout plus translate, and a rotation by
     * getRotate() degrees about the center of the node's layout bounds (its bounds in local here).
     */
    public static double[] toParent(Node node) {
        if (!(node instanceof Shape)) {
            return transform(node);
        }
        // A shape's transform changes only with what Frames.touch counts.
        NodeData d = NodeData.of(node);
        if (d.toParentVersion != d.version) {
            d.toParent = transform(node);
            d.toParentVersion = d.version;
        }
        return d.toParent;
    }

    private static double[] transform(Node node) {
        double tx = node.getTranslateX() + node.getLayoutX();
        double ty = node.getTranslateY() + node.getLayoutY();
        double angle = node.getRotate();
        if (angle == 0) {
            return new double[] { 1, 0, tx, 0, 1, ty };
        }
        float[] box = layoutBox(node);
        double px = 0;
        double py = 0;
        if (box != null) {
            // The center of the layout bounds as JavaFX's Bounds gives it: max is min plus the
            // width, the difference of the two floats.
            double minX = box[0];
            double minY = box[1];
            float width = box[2] - box[0];
            float height = box[3] - box[1];
            px = (minX + (minX + width)) / 2.0;
            py = (minY + (minY + height)) / 2.0;
        }
        double sin;
        double cos;
        NodeData d = node instanceof Shape ? NodeData.of(node) : null;
        if (d != null && d.angle == angle) {
            sin = d.sin;
            cos = d.cos;
        } else {
            double theta = Math.toRadians(angle);
            sin = Math.sin(theta);
            cos = Math.cos(theta);
            // Quarter turns are exact.
            if (sin == 1.0 || sin == -1.0) {
                cos = 0.0;
            } else if (cos == 1.0 || cos == -1.0) {
                sin = 0.0;
            }
            if (d != null) {
                d.angle = angle;
                d.sin = sin;
                d.cos = cos;
            }
        }
        // translate(tx + px, ty + py), rotate, translate(-px, -py)
        double mxt = tx + px;
        double myt = ty + py;
        mxt = cos * -px + -sin * -py + mxt;
        myt = sin * -px + cos * -py + myt;
        return new double[] { cos, -sin, mxt, sin, cos, myt };
    }

    static float tx(double[] m, double x, double y) {
        return (float) (m[0] * x + m[1] * y + m[2]);
    }

    static float ty(double[] m, double x, double y) {
        return (float) (m[3] * x + m[4] * y + m[5]);
    }

    /** The layout bounds that rotate turns about: a region's size; for other nodes their bounds in local. */
    private static float[] layoutBox(Node node) {
        if (node instanceof Region) {
            Region r = (Region) node;
            return new float[] { 0, 0, (float) size(r.getPrefWidth()), (float) size(r.getPrefHeight()) };
        }
        return localBox(node);
    }

    private static double size(double pref) {
        return pref >= 0 ? pref : 0;
    }

    // ------------------------------------------------------------------ bounds

    public static Bounds boundsInLocal(Node node) {
        if (node instanceof Path) {
            Paths p = paths();
            return p.bounds((Path) node);
        }
        return bounds(localBox(node));
    }

    public static Bounds boundsInParent(Node node) {
        return bounds(parentBox(node));
    }

    /** The node's box in its own coordinates, or null when it is empty (a shape's is kept until it changes). */
    static float[] localBox(Node node) {
        if (!(node instanceof Shape)) {
            return box(node, null);
        }
        if (node instanceof Path) {
            Paths p = paths();
            return p == null ? null : p.box((Path) node);
        }
        NodeData d = NodeData.of(node);
        if (d.boxVersion != d.shapeVersion) {
            d.localBox = box(node, null);
            d.boxVersion = d.shapeVersion;
        }
        return d.localBox;
    }

    /** The node's box in its parent's coordinates, or null when it is empty (a shape's is kept until it changes). */
    static float[] parentBox(Node node) {
        if (!(node instanceof Shape)) {
            return box(node, toParent(node));
        }
        NodeData d = NodeData.of(node);
        if (d.placedVersion != d.version) {
            double[] m = toParent(node);
            float[] placed = box(node, m);
            if (placed == null && !(node instanceof Path)) {
                placed = emptyTurned(node, m);
            }
            d.parentBox = placed;
            d.placedVersion = d.version;
        }
        return d.parentBox;
    }

    /**
     * The bounds in parent of a shape that covers nothing (no fill and no stroke, or no area):
     * empty, as JavaFX's, except after a turn by an exact quarter (90, 180 or 270 degrees), where
     * JavaFX turns its empty bounds (0, 0) to (-1, -1) as if they were a real box and gives a box
     * of 1 x 1 from (-1, -1) to (0, 0), moved by the translate and layout (OpenJFX 21.0.12; any
     * other angle, and no turn at all, keep the bounds empty).
     */
    private static float[] emptyTurned(Node node, double[] m) {
        boolean turned = node.getRotate() != 0 && quadrant(m) && !(m[0] == 1 && m[4] == 1);
        if (!turned) {
            return null;
        }
        double tx = node.getTranslateX() + node.getLayoutX();
        double ty = node.getTranslateY() + node.getLayoutY();
        return new float[] { (float) (tx - 1), (float) (ty - 1), (float) tx, (float) ty };
    }

    /** A box being made: the points added so far, rounded to float. */
    private static final class Box {
        float minX = Float.POSITIVE_INFINITY;
        float minY = Float.POSITIVE_INFINITY;
        float maxX = Float.NEGATIVE_INFINITY;
        float maxY = Float.NEGATIVE_INFINITY;
        final double[] m;

        Box(double[] m) {
            this.m = m;
        }

        /** Adds a point given in the node's coordinates (placed by the transform, when there is one). */
        void add(double x, double y) {
            float fx;
            float fy;
            if (m == null) {
                fx = (float) x;
                fy = (float) y;
            } else {
                fx = tx(m, x, y);
                fy = ty(m, x, y);
            }
            addPlaced(fx, fy);
        }

        void addPlaced(float fx, float fy) {
            if (fx < minX) {
                minX = fx;
            }
            if (fx > maxX) {
                maxX = fx;
            }
            if (fy < minY) {
                minY = fy;
            }
            if (fy > maxY) {
                maxY = fy;
            }
        }

        boolean isEmpty() {
            return !(minX <= maxX);
        }

        float[] result(float pad) {
            if (isEmpty()) {
                return null;
            }
            return new float[] { minX - pad, minY - pad, maxX + pad, maxY + pad };
        }
    }

    /** The box of the node, placed by m (null: in its own coordinates). */
    private static float[] box(Node node, double[] m) {
        if (node instanceof Shape) {
            return shapeBox((Shape) node, m);
        }
        float[] local = otherBox(node);
        if (local == null || m == null) {
            return local;
        }
        Box b = new Box(m);
        b.add(local[0], local[1]);
        b.add(local[2], local[1]);
        b.add(local[2], local[3]);
        b.add(local[0], local[3]);
        return b.result(0);
    }

    /** The box of a node that isn't a shape, in its own coordinates (see the class comment). */
    private static float[] otherBox(Node node) {
        float[] own;
        if (node instanceof Region) {
            Region r = (Region) node;
            own = new float[] { 0, 0, (float) size(r.getPrefWidth()), (float) size(r.getPrefHeight()) };
        } else if (node instanceof Canvas) {
            Canvas c = (Canvas) node;
            own = new float[] { 0, 0, (float) c.getWidth(), (float) c.getHeight() };
        } else if (node instanceof ImageView) {
            Image image = ((ImageView) node).getImage();
            own = new float[] { 0, 0, image == null ? 0 : (float) image.getWidth(), image == null ? 0 : (float) image.getHeight() };
        } else {
            own = new float[] { 0, 0, 0, 0 };
        }
        if (node instanceof Parent) {
            List<Node> children = ((Parent) node).getChildrenUnmodifiable();
            for (int i = 0; i < children.size(); i++) {
                float[] c = parentBox(children.get(i));
                if (c != null) {
                    own[0] = Math.min(own[0], c[0]);
                    own[1] = Math.min(own[1], c[1]);
                    own[2] = Math.max(own[2], c[2]);
                    own[3] = Math.max(own[3], c[3]);
                }
            }
        }
        return own;
    }

    private static boolean stroked(Shape s) {
        return s.getStroke() != null;
    }

    private static float[] shapeBox(Shape shape, double[] m) {
        // A shape with neither a fill nor a stroke covers nothing: JavaFX's bounds are empty then
        // (fx-check's probe 29, a Rectangle with setFill(null)). A Text keeps its box.
        if (shape.getFill() == null && shape.getStroke() == null && !(shape instanceof Text)) {
            return null;
        }
        Box b = new Box(m);
        if (shape instanceof Polygon) {
            double[] pts = points((Polygon) shape);
            if (!stroked(shape)) {
                for (int i = 0; i + 1 < pts.length; i += 2) {
                    b.add(pts[i], pts[i + 1]);
                }
                return b.result(0);
            }
            // The outline of the stroke (and the polygon's own points), then 0.5 more, as JavaFX gives it.
            double[] outline = Outlines.strokeOutline(pts, shape.getStrokeWidth() / 2);
            for (int i = 0; i + 1 < pts.length; i += 2) {
                b.add(pts[i], pts[i + 1]);
            }
            for (int i = 0; i + 1 < outline.length; i += 2) {
                b.add(outline[i], outline[i + 1]);
            }
            return b.result(0.5f);
        }
        if (shape instanceof Rectangle) {
            // JavaFX keeps a rectangle's x, y, width and height as doubles: the corners are placed
            // from them and then rounded.
            Rectangle r = (Rectangle) shape;
            if (r.getWidth() < 0 || r.getHeight() < 0) {
                return null;
            }
            double pad = stroked(shape) ? shape.getStrokeWidth() / 2 : 0;
            double x = r.getX() - pad;
            double y = r.getY() - pad;
            double x2 = r.getX() + r.getWidth() + pad;
            double y2 = r.getY() + r.getHeight() + pad;
            if (m == null || quadrant(m)) {
                // In its own coordinates, moved or turned by quarter turns: the rounded box, placed.
                float[] local = { (float) x, (float) y, (float) x2, (float) y2 };
                if (m == null) {
                    return local;
                }
                b.add(local[0], local[1]);
                b.add(local[2], local[3]);
                return b.result(0);
            }
            b.add(x, y);
            b.add(x2, y);
            b.add(x2, y2);
            b.add(x, y2);
            return b.result(0);
        }
        if (shape instanceof Circle) {
            Circle c = (Circle) shape;
            if (c.getRadius() < 0) {
                return null;
            }
            double r = c.getRadius() + (stroked(shape) ? shape.getStrokeWidth() / 2 : 0);
            float[] local = { (float) (c.getCenterX() - r), (float) (c.getCenterY() - r), (float) (c.getCenterX() + r), (float) (c.getCenterY() + r) };
            if (m == null) {
                return local;
            }
            if (quadrant(m)) {
                // A translation or a quarter turn: the box placed as it is.
                b.add(local[0], local[1]);
                b.add(local[2], local[3]);
                return b.result(0);
            }
            // Turned by another angle: the center placed, plus and minus the radius. (JavaFX's own
            // bounds here are, for some angles, those of its curves: up to 0.03% of the radius
            // bigger, and with a stroke 0.5 more.)
            double cx = m[0] * c.getCenterX() + m[1] * c.getCenterY() + m[2];
            double cy = m[3] * c.getCenterX() + m[4] * c.getCenterY() + m[5];
            return new float[] { (float) (cx - r), (float) (cy - r), (float) (cx + r), (float) (cy + r) };
        }
        if (shape instanceof Line) {
            Line l = (Line) shape;
            if (!stroked(shape)) {
                return null;
            }
            double x1 = l.getStartX();
            double y1 = l.getStartY();
            double x2 = l.getEndX();
            double y2 = l.getEndY();
            double hw = shape.getStrokeWidth() / 2;
            if (m == null || quadrant(m)) {
                // The ends, half the width more on every side for a level or upright line and
                // that times the square root of 2 for a slanted one; then placed as a box.
                double half = Math.max(hw, 0.5);
                double pad = x1 == x2 || y1 == y2 ? half : half * Math.sqrt(2);
                float[] local = { (float) (Math.min(x1, x2) - pad), (float) (Math.min(y1, y2) - pad), (float) (Math.max(x1, x2) + pad), (float) (Math.max(y1, y2) + pad) };
                if (m == null) {
                    return local;
                }
                b.add(local[0], local[1]);
                b.add(local[2], local[3]);
                return b.result(0);
            }
            // Turned by another angle: the outline of the stroke (square caps) placed, and 0.5
            // more on every side, as JavaFX gives a stroked outline's bounds.
            for (double[] piece : Outlines.strokePieces(new double[] { x1, y1, x2, y2 }, hw, false)) {
                for (int i = 0; i + 1 < piece.length; i += 2) {
                    b.add(piece[i], piece[i + 1]);
                }
            }
            return b.result(0.5f);
        }
        if (shape instanceof Text) {
            double[] r = textBox((Text) shape);
            b.add(r[0], r[1]);
            b.add(r[2], r[1]);
            b.add(r[2], r[3]);
            b.add(r[0], r[3]);
            return b.result(0);
        }
        if (shape instanceof Path) {
            Paths p = paths();
            float[] area = p == null ? null : p.box((Path) shape);
            if (area == null) {
                return null;
            }
            b.add(area[0], area[1]);
            b.add(area[2], area[1]);
            b.add(area[2], area[3]);
            b.add(area[0], area[3]);
            return b.result(0);
        }
        return null;
    }

    /** Whether the transform only moves, or turns by a multiple of 90 degrees. */
    static boolean quadrant(double[] m) {
        return (m[1] == 0 && m[3] == 0) || (m[0] == 0 && m[4] == 0);
    }

    /** A text's estimated box { minX, minY, maxX, maxY } in its own coordinates (see the class comment). */
    static double[] textBox(Text text) {
        double size = text.getFont() == null ? 13 : text.getFont().getSize();
        double width = text.getText().length() * size * 0.5;
        return new double[] { text.getX(), text.getY() - size * 0.93, text.getX() + width, text.getY() + size * 0.24 };
    }

    /** A polygon's points as doubles, rounded to float as JavaFX keeps them (a last x without a y left out). */
    static double[] points(Polygon polygon) {
        List<Double> list = polygon.getPoints();
        int n = list.size() & ~1;
        double[] pts = new double[n];
        for (int i = 0; i < n; i++) {
            pts[i] = (float) list.get(i).doubleValue();
        }
        return pts;
    }
}
