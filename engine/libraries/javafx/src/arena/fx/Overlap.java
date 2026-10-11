// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.List;
import javafx.scene.paint.Paint;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.shape.Path;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.scene.text.Text;

/**
 * Shape.intersect: whether two shapes have an area in common, and the box around it.
 *
 * <p>Each shape is its fill (when it has one) and its stroke (when it has one, see Outlines),
 * placed in its parent's coordinates by its layout, translate and rotate, each point rounded to
 * float as JavaFX keeps a shape's outline. A circle is what JavaFX makes of it: four cubic Bezier
 * curves, one per quarter. Shapes overlap when the area they share is more than nothing: shapes
 * that only touch along an edge or at a corner don't, as with JavaFX's area intersection.
 *
 * <p>Straight outlines are compared exactly: for points rounded to float the side a point is on
 * (an orientation test) is computed without error. A curve is compared through two polygons, one
 * inside it (its chords) and one around it (its control points): when the polygons inside overlap,
 * the shapes do; when the polygons around them don't, the shapes don't; otherwise the curves near
 * the other shape are halved and compared again, so only shapes that come within about 1e-9 of
 * each other without overlapping are told apart less exactly. The box of a result with a curve in
 * it is the box of the polygons inside the curves after a few halvings of the segments near the
 * other shape only, so it is approximate: arcs away from the other shape stay one chord per quarter,
 * and the box can be smaller than JavaFX's by up to about 0.29 of the radius; with a stroke it can
 * differ by tenths or more. Only empty or not is meant to match there. The box of the overlap of
 * polygons and rectangles without a stroke is JavaFX's exactly.
 */
public final class Overlap {
    private Overlap() {
    }

    private static final double KAPPA = 0.5522847498307933;
    /** How many times a curve may be halved while telling whether two shapes touch or overlap. */
    private static final int MAX_ROUNDS = 40;
    /** How many more times the curves are halved for the box of an overlap. */
    private static final int BOX_ROUNDS = 2;
    /** No more segments than this per piece (a near tangency against a large concave outline). */
    private static final int MAX_SEGMENTS = 4096;

    /** One closed piece of a shape's area: a polygon, or an outline with curves. */
    private static final class Piece {
        /** The polygon's x, y pairs (null for an outline with curves). */
        double[] poly;
        /** The outline's segments: {x0, y0, x1, y1, x2, y2, x3, y3, cubic (1) or line (0), bulge}. */
        List<double[]> segs;
        /** Whether the piece is convex (a disc, a band of a stroke, or a convex polygon). */
        boolean convex;
        float minX = Float.POSITIVE_INFINITY;
        float minY = Float.POSITIVE_INFINITY;
        float maxX = Float.NEGATIVE_INFINITY;
        float maxY = Float.NEGATIVE_INFINITY;

        void include(double x, double y) {
            float fx = (float) x;
            float fy = (float) y;
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

        boolean overlapsBox(Piece o) {
            return minX < o.maxX && o.minX < maxX && minY < o.maxY && o.minY < maxY;
        }
    }

    /** The box { minX, minY, maxX, maxY } of the area the shapes share, or null when they don't overlap. */
    /** A shape's pieces and the box around them all, kept until the shape changes (Frames.touch). */
    private static final class Area {
        final List<Piece> pieces;
        float minX = Float.POSITIVE_INFINITY;
        float minY = Float.POSITIVE_INFINITY;
        float maxX = Float.NEGATIVE_INFINITY;
        float maxY = Float.NEGATIVE_INFINITY;

        Area(List<Piece> pieces) {
            this.pieces = pieces;
            for (Piece p : pieces) {
                if (p.minX < minX) {
                    minX = p.minX;
                }
                if (p.minY < minY) {
                    minY = p.minY;
                }
                if (p.maxX > maxX) {
                    maxX = p.maxX;
                }
                if (p.maxY > maxY) {
                    maxY = p.maxY;
                }
            }
        }
    }

    /**
     * Whether the shapes are surely apart: the circles around their boxes (each turned about its
     * box's center, so the circle only moves with the translate and layout) don't meet, with room
     * for rounding. Quick, so most pairs of shapes in a game never need their outlines placed.
     */
    private static boolean apart(Shape a, Shape b) {
        double[] ca = reach(a);
        double[] cb = reach(b);
        if (ca == null || cb == null) {
            // A shape without an area (a polygon without points can't be intersected, as in JavaFX).
            emptyPolygon(a);
            emptyPolygon(b);
            return true;
        }
        double dx = ca[0] - cb[0];
        double dy = ca[1] - cb[1];
        double r = ca[2] + cb[2];
        return dx * dx + dy * dy > r * r;
    }

    /** As JavaFX: intersect with a polygon without points throws an IndexOutOfBoundsException. */
    private static void emptyPolygon(Shape s) {
        if (s instanceof Polygon && ((Polygon) s).getPoints().isEmpty()) {
            ((Polygon) s).getPoints().get(0);
        }
    }

    /**
     * The circle the shape is surely within in its parent, { x, y, radius }, or null when it has
     * no box: its box's center moved by the translate and layout (it turns about that center), and
     * half its width plus height (at least half its diagonal, without Math.sqrt, slow in the
     * browser's interpreter), with room for rounding. Kept until the shape changes.
     */
    private static double[] reach(Shape shape) {
        NodeData d = NodeData.of(shape);
        if (d.reachVersion == d.version && d.reachVersion >= 0) {
            return d.reach;
        }
        float[] box = Geometry.localBox(shape);
        double[] c = null;
        if (box != null) {
            double x = (box[0] + (double) box[2]) / 2 + shape.getTranslateX() + shape.getLayoutX();
            double y = (box[1] + (double) box[3]) / 2 + shape.getTranslateY() + shape.getLayoutY();
            double r = (box[2] - (double) box[0] + box[3] - (double) box[1]) / 2;
            double size = r + (x < 0 ? -x : x) + (y < 0 ? -y : y);
            c = new double[] { x, y, r + 1e-4 * size + 1e-6 };
        }
        d.reach = c;
        d.reachVersion = d.version;
        return c;
    }

    private static Area area(Shape shape) {
        NodeData d = NodeData.of(shape);
        if (d.piecesVersion != d.version || d.pieces == null) {
            d.pieces = new Area(pieces(shape));
            d.piecesVersion = d.version;
        }
        return (Area) d.pieces;
    }

    public static float[] intersect(Shape a, Shape b) {
        if (apart(a, b)) {
            return null;
        }
        Area areaA = area(a);
        Area areaB = area(b);
        if (!(areaA.minX < areaB.maxX && areaB.minX < areaA.maxX && areaA.minY < areaB.maxY && areaB.minY < areaA.maxY)) {
            return null;
        }
        List<Piece> pa = areaA.pieces;
        List<Piece> pb = areaB.pieces;
        float[] box = null;
        for (Piece x : pa) {
            for (Piece y : pb) {
                if (!x.overlapsBox(y)) {
                    continue;
                }
                float[] r = pairBox(x, y);
                if (r != null) {
                    box = box == null ? r : new float[] { Math.min(box[0], r[0]), Math.min(box[1], r[1]), Math.max(box[2], r[2]), Math.max(box[3], r[3]) };
                }
            }
        }
        return box;
    }

    // ------------------------------------------------------------------ a shape's pieces

    private static List<Piece> pieces(Shape shape) {
        double[] m = Geometry.toParent(shape);
        List<Piece> out = new ArrayList<Piece>();
        Paint fill = shape.getFill();
        boolean stroked = shape.getStroke() != null && shape.getStrokeWidth() > 0;
        double hw = shape.getStrokeWidth() / 2;
        if (shape instanceof Polygon) {
            Polygon polygon = (Polygon) shape;
            double[] pts = Geometry.points(polygon);
            if (fill != null) {
                Piece p = polygon(pts, m);
                p.convex = convexPoints(polygon, pts);
                out.add(p);
            }
            if (stroked) {
                for (double[] piece : Outlines.strokePieces(pts, hw, true)) {
                    out.add(convex(polygon(piece, m)));
                }
            }
        } else if (shape instanceof Rectangle) {
            Rectangle r = (Rectangle) shape;
            float x = (float) r.getX();
            float y = (float) r.getY();
            // As JavaFX keeps a rectangle's outline: x, y, width and height in float, the far
            // corner their sum in float.
            float x2 = x + (float) r.getWidth();
            float y2 = y + (float) r.getHeight();
            double[] pts = { x, y, x2, y, x2, y2, x, y2 };
            if (r.getWidth() > 0 && r.getHeight() > 0) {
                if (fill != null) {
                    out.add(convex(polygon(pts, m)));
                }
                if (stroked) {
                    for (double[] piece : Outlines.strokePieces(pts, hw, true)) {
                        out.add(polygon(piece, m));
                    }
                }
            }
        } else if (shape instanceof Circle) {
            Circle c = (Circle) shape;
            double r = c.getRadius();
            double cx = c.getCenterX();
            double cy = c.getCenterY();
            if (r > 0) {
                if (stroked) {
                    if (fill != null || r - hw <= 0) {
                        out.add(disc(cx, cy, r + hw, m));
                    } else {
                        ring(cx, cy, r + hw, r - hw, m, out);
                    }
                } else if (fill != null) {
                    out.add(disc(cx, cy, r, m));
                }
            }
        } else if (shape instanceof Line) {
            Line l = (Line) shape;
            if (stroked) {
                double[] pts = { (float) l.getStartX(), (float) l.getStartY(), (float) l.getEndX(), (float) l.getEndY() };
                for (double[] piece : Outlines.strokePieces(pts, hw, false)) {
                    out.add(convex(polygon(piece, m)));
                }
            }
        } else if (shape instanceof Text) {
            // An estimate: the box of the text (Java Arena doesn't have the letters' outlines).
            double[] r = Geometry.textBox((Text) shape);
            if (fill != null && r[2] > r[0]) {
                out.add(convex(polygon(new double[] { r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3] }, m)));
            }
        } else if (shape instanceof Path) {
            // The box of the area of an earlier intersect (its outline isn't kept).
            float[] r = Geometry.localBox(shape);
            if (r != null && fill != null && r[2] > r[0] && r[3] > r[1]) {
                out.add(convex(polygon(new double[] { r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3] }, m)));
            }
        }
        return out;
    }

    /**
     * Whether a polygon's points make a convex polygon: kept until the points change (moving or
     * turning a polygon doesn't change it).
     */
    private static boolean convexPoints(Polygon polygon, double[] pts) {
        NodeData d = NodeData.of(polygon);
        int changes = ((ObservableArrayList<Double>) polygon.getPoints()).changes();
        if (d.convexChanges != changes || d.convexKnown == 0) {
            d.convexKnown = Polygons.convex(pts) ? 1 : -1;
            d.convexChanges = changes;
        }
        return d.convexKnown > 0;
    }

    /** The piece, marked convex (a rectangle, a band of a stroke or a join: convex by how they are made). */
    private static Piece convex(Piece p) {
        p.convex = true;
        return p;
    }

    /** A polygon piece, its points placed by m and rounded to float. */
    private static Piece polygon(double[] pts, double[] m) {
        Piece p = new Piece();
        int n = pts.length & ~1;
        p.poly = new double[n];
        for (int i = 0; i < n; i += 2) {
            double x = Geometry.tx(m, pts[i], pts[i + 1]);
            double y = Geometry.ty(m, pts[i], pts[i + 1]);
            p.poly[i] = x;
            p.poly[i + 1] = y;
            p.include(x, y);
        }
        return p;
    }

    /** A cubic segment from local points, placed by m and rounded to float. */
    private static double[] cubic(double[] m, int bulge, double... local) {
        double[] s = new double[10];
        for (int i = 0; i < 8; i += 2) {
            s[i] = Geometry.tx(m, local[i], local[i + 1]);
            s[i + 1] = Geometry.ty(m, local[i], local[i + 1]);
        }
        s[8] = 1;
        s[9] = bulge;
        return s;
    }

    private static double[] line(double x0, double y0, double x3, double y3) {
        return new double[] { x0, y0, x0, y0, x3, y3, x3, y3, 0, 0 };
    }

    /** Where the curves' points are across a circle's box: JavaFX's control values for a quarter circle. */
    private static final double PCV = 0.5 + KAPPA * 0.5;
    private static final double NCV = 0.5 - KAPPA * 0.5;

    /**
     * The four quarters of a circle of radius r, as cubic curves (start, two control points, end)
     * going round. As JavaFX keeps a circle's outline: its box (x, y and the width) in float, and
     * each point at x plus a part of the width (0, 0.5 and 1 for the ends, PCV and NCV for the
     * control points), rounded to float.
     */
    private static double[][] quarters(double centerX, double centerY, double radius) {
        float x = (float) (centerX - radius);
        float y = (float) (centerY - radius);
        float w = (float) (radius * 2);
        double[] cs = { 0, NCV, 0.5, PCV, 1 };
        float[] xs = new float[5];
        float[] ys = new float[5];
        for (int i = 0; i < 5; i++) {
            xs[i] = (float) (x + cs[i] * w);
            ys[i] = (float) (y + cs[i] * w);
        }
        // index: 0 = left/top, 1 = NCV, 2 = middle, 3 = PCV, 4 = right/bottom
        return new double[][] {
            { xs[4], ys[2], xs[4], ys[3], xs[3], ys[4], xs[2], ys[4] },
            { xs[2], ys[4], xs[1], ys[4], xs[0], ys[3], xs[0], ys[2] },
            { xs[0], ys[2], xs[0], ys[1], xs[1], ys[0], xs[2], ys[0] },
            { xs[2], ys[0], xs[3], ys[0], xs[4], ys[1], xs[4], ys[2] },
        };
    }

    private static Piece disc(double cx, double cy, double r, double[] m) {
        Piece p = new Piece();
        p.segs = new ArrayList<double[]>();
        for (double[] q : quarters(cx, cy, r)) {
            p.segs.add(cubic(m, 1, q));
        }
        p.convex = true;
        bound(p);
        return p;
    }

    /**
     * A ring (a circle's stroke without its fill) as pieces, each between an arc of the outer
     * circle and the same arc of the inner one. The arcs are short enough that the chord of an
     * outer arc and the control points of an inner one stay in the ring (with quarter arcs, the
     * outer chord would cut through the hole of a thin ring).
     */
    private static void ring(double cx, double cy, double outer, double inner, double[] m, List<Piece> out) {
        double[][] o = quarters(cx, cy, outer);
        double[][] i = quarters(cx, cy, inner);
        int halvings = 0;
        double angle = Math.PI / 2;
        while (halvings < 8 && outer * angle * angle / 4 >= (outer - inner) / 2) {
            angle /= 2;
            halvings++;
        }
        for (int q = 0; q < 4; q++) {
            List<double[]> outs = halve(cubic(m, 1, o[q]), halvings);
            List<double[]> ins = halve(cubic(m, -1, i[q]), halvings);
            for (int k = 0; k < outs.size(); k++) {
                double[] arc = outs.get(k);
                double[] in = ins.get(k);
                double[] back = { in[6], in[7], in[4], in[5], in[2], in[3], in[0], in[1], 1, -1 };
                Piece p = new Piece();
                p.segs = new ArrayList<double[]>();
                p.segs.add(arc);
                p.segs.add(line(arc[6], arc[7], back[0], back[1]));
                p.segs.add(back);
                p.segs.add(line(back[6], back[7], arc[0], arc[1]));
                bound(p);
                out.add(p);
            }
        }
    }

    /** A cubic segment halved n times, in order. */
    private static List<double[]> halve(double[] seg, int n) {
        List<double[]> segs = new ArrayList<double[]>();
        segs.add(seg);
        for (int k = 0; k < n; k++) {
            List<double[]> next = new ArrayList<double[]>();
            for (double[] s : segs) {
                double[][] h = halves(s);
                next.add(h[0]);
                next.add(h[1]);
            }
            segs = next;
        }
        return segs;
    }

    /** The two halves of a cubic segment (de Casteljau at t = 0.5). */
    private static double[][] halves(double[] s) {
        double ax = (s[0] + s[2]) / 2;
        double ay = (s[1] + s[3]) / 2;
        double bx = (s[2] + s[4]) / 2;
        double by = (s[3] + s[5]) / 2;
        double cx = (s[4] + s[6]) / 2;
        double cy = (s[5] + s[7]) / 2;
        double dx = (ax + bx) / 2;
        double dy = (ay + by) / 2;
        double ex = (bx + cx) / 2;
        double ey = (by + cy) / 2;
        double fx = (dx + ex) / 2;
        double fy = (dy + ey) / 2;
        return new double[][] { { s[0], s[1], ax, ay, dx, dy, fx, fy, 1, s[9] }, { fx, fy, ex, ey, cx, cy, s[6], s[7], 1, s[9] } };
    }

    private static void bound(Piece p) {
        for (double[] s : p.segs) {
            for (int i = 0; i < 8; i += 2) {
                p.include(s[i], s[i + 1]);
            }
        }
    }

    // ------------------------------------------------------------------ curves

    /** The polygon inside an outline with curves (inner) or around it (outer). */
    private static double[] approx(List<double[]> segs, boolean inner) {
        int count = 0;
        for (double[] s : segs) {
            count += s[8] == 1 && (s[9] > 0) != inner ? 6 : 2;
        }
        double[] out = new double[count];
        int k = 0;
        for (double[] s : segs) {
            out[k++] = s[0];
            out[k++] = s[1];
            if (s[8] == 1 && (s[9] > 0) != inner) {
                // The control points: outside a curve that bulges out, inside one that bulges in.
                out[k++] = s[2];
                out[k++] = s[3];
                out[k++] = s[4];
                out[k++] = s[5];
            }
        }
        return out;
    }

    private static List<double[]> segments(Piece p) {
        if (p.segs != null) {
            return p.segs;
        }
        List<double[]> segs = new ArrayList<double[]>();
        int n = p.poly.length / 2;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            segs.add(line(p.poly[2 * i], p.poly[2 * i + 1], p.poly[2 * j], p.poly[2 * j + 1]));
        }
        return segs;
    }

    /** The box { minX, minY, maxX, maxY } of each segment's points (control points included). */
    private static double[][] boxes(List<double[]> segs) {
        double[][] out = new double[segs.size()][];
        for (int i = 0; i < out.length; i++) {
            double[] s = segs.get(i);
            out[i] = new double[] { Math.min(Math.min(s[0], s[2]), Math.min(s[4], s[6])), Math.min(Math.min(s[1], s[3]), Math.min(s[5], s[7])), Math.max(Math.max(s[0], s[2]), Math.max(s[4], s[6])), Math.max(Math.max(s[1], s[3]), Math.max(s[5], s[7])) };
        }
        return out;
    }

    /**
     * Halves every curve whose box meets the box of a segment of the other outline (so only the
     * curves near the other shape are made finer). Null when none was halved.
     */
    private static List<double[]> split(List<double[]> segs, List<double[]> other) {
        if (segs.size() >= MAX_SEGMENTS) {
            return null;
        }
        double[][] mine = boxes(segs);
        double[][] theirs = boxes(other);
        List<double[]> out = new ArrayList<double[]>(segs.size() + 8);
        boolean any = false;
        for (int i = 0; i < mine.length; i++) {
            double[] s = segs.get(i);
            boolean near = false;
            if (s[8] == 1) {
                double[] b = mine[i];
                for (double[] o : theirs) {
                    if (!(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3])) {
                        near = true;
                        break;
                    }
                }
            }
            if (!near) {
                out.add(s);
                continue;
            }
            any = true;
            double[][] h = halves(s);
            out.add(h[0]);
            out.add(h[1]);
        }
        return any ? out : null;
    }

    /** The box of the overlap of two pieces, or null. */
    private static float[] pairBox(Piece a, Piece b) {
        if (a.segs == null && b.segs == null) {
            return Polygons.overlapBox(a.poly, b.poly, a.convex, b.convex);
        }
        boolean ca = a.convex;
        boolean cb = b.convex;
        List<double[]> sa = segments(a);
        List<double[]> sb = segments(b);
        for (int round = 0; round < MAX_ROUNDS; round++) {
            float[] box = Polygons.overlapBox(approx(sa, true), approx(sb, true), ca, cb);
            if (box != null) {
                for (int k = 0; k < BOX_ROUNDS; k++) {
                    List<double[]> na = split(sa, sb);
                    List<double[]> nb = split(sb, sa);
                    if (na == null && nb == null) {
                        break;
                    }
                    sa = na == null ? sa : na;
                    sb = nb == null ? sb : nb;
                }
                float[] fine = Polygons.overlapBox(approx(sa, true), approx(sb, true), ca, cb);
                return fine != null ? fine : box;
            }
            double[] outerA = approx(sa, false);
            double[] outerB = approx(sb, false);
            if (Polygons.overlapBox(outerA, outerB, ca, cb) == null) {
                return null;
            }
            List<double[]> na = split(sa, sb);
            List<double[]> nb = split(sb, sa);
            if (na == null && nb == null) {
                return null;
            }
            sa = na == null ? sa : na;
            sb = nb == null ? sb : nb;
        }
        return null;
    }
}
