// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

/**
 * Whether two polygons (any shape, concave or crossing themselves, filled by the non-zero winding
 * rule as JavaFX fills a shape) share an area, and the box around it.
 *
 * <p>Every edge of each polygon is cut where the other polygon's outline crosses or touches it.
 * A piece of an edge that lies inside the other polygon, next to its own polygon's area, is on the
 * outline of the shared area; so is a piece both outlines run along, when both polygons' areas are
 * on the same side of it. The shared area is more than nothing exactly when there is such a piece,
 * and its box is the box of those pieces' ends. Shapes that only touch, along an edge or at a
 * corner, have no such piece. The side tests are exact for points rounded to float (their
 * differences and products are exact in double), so touching is told from overlapping exactly.
 */
final class Polygons {
    private Polygons() {
    }

    /** An edge and the points where the other outline meets it. */
    private static final class Edge {
        final double ax;
        final double ay;
        final double bx;
        final double by;
        double[] cuts = new double[12];
        int count;
        /** Parameter intervals [from, to] along the edge that an edge of the other polygon runs along. */
        double[] along;
        int alongCount;

        /** The edge's box. */
        final double minX;
        final double minY;
        final double maxX;
        final double maxY;

        Edge(double ax, double ay, double bx, double by) {
            this.ax = ax;
            this.ay = ay;
            this.bx = bx;
            this.by = by;
            minX = ax < bx ? ax : bx;
            maxX = ax < bx ? bx : ax;
            minY = ay < by ? ay : by;
            maxY = ay < by ? by : ay;
            cut(0, ax, ay);
            cut(1, bx, by);
        }

        void cut(double t, double x, double y) {
            if (count + 3 > cuts.length) {
                double[] more = new double[cuts.length * 2];
                System.arraycopy(cuts, 0, more, 0, count);
                cuts = more;
            }
            cuts[count++] = t;
            cuts[count++] = x;
            cuts[count++] = y;
        }

        void runsAlong(double from, double to) {
            if (along == null) {
                along = new double[4];
            } else if (alongCount + 2 > along.length) {
                double[] more = new double[along.length * 2];
                System.arraycopy(along, 0, more, 0, alongCount);
                along = more;
            }
            along[alongCount++] = from;
            along[alongCount++] = to;
        }

        /** The parameter of a point on the edge's line. */
        double param(double x, double y) {
            double dx = bx - ax;
            double dy = by - ay;
            return ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
        }
    }

    /** Which side of a to b the point p is on: positive left, negative right, 0 on the line. */
    static double orient(double ax, double ay, double bx, double by, double px, double py) {
        return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    }

    private static boolean opposite(double u, double v) {
        return (u > 0 && v < 0) || (u < 0 && v > 0);
    }

    private static Edge[] edges(double[] poly) {
        int n = poly.length / 2;
        Edge[] all = new Edge[n];
        int k = 0;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            double ax = poly[2 * i];
            double ay = poly[2 * i + 1];
            double bx = poly[2 * j];
            double by = poly[2 * j + 1];
            if (ax != bx || ay != by) {
                all[k++] = new Edge(ax, ay, bx, by);
            }
        }
        Edge[] out = new Edge[k];
        System.arraycopy(all, 0, out, 0, k);
        return out;
    }

    /** The non-zero winding number of the polygon around (x, y). */
    static int winding(double[] poly, double x, double y) {
        int w = 0;
        int n = poly.length / 2;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            double ax = poly[2 * i];
            double ay = poly[2 * i + 1];
            double bx = poly[2 * j];
            double by = poly[2 * j + 1];
            if (ay <= y) {
                if (by > y && orient(ax, ay, bx, by, x, y) > 0) {
                    w++;
                }
            } else if (by <= y && orient(ax, ay, bx, by, x, y) < 0) {
                w--;
            }
        }
        return w;
    }

    /** The box { minX, minY, maxX, maxY } (floats) of the area the two polygons share, or null when there is none. */
    static float[] overlapBox(double[] p, double[] q) {
        return overlapBox(p, q, false, false);
    }

    /** overlapBox, told which polygons are convex (Polygons.convex). */
    static float[] overlapBox(double[] p, double[] q, boolean convexP, boolean convexQ) {
        if (p.length < 6 || q.length < 6) {
            return null;
        }
        double[] bp = box(p);
        double[] bq = box(q);
        if (!(bp[0] < bq[2] && bq[0] < bp[2] && bp[1] < bq[3] && bq[1] < bp[3])) {
            return null;
        }
        if (convexP && convexQ) {
            return convexBox(p, q);
        }
        Edge[] ep = edges(p);
        Edge[] eq = edges(q);
        for (Edge e : ep) {
            for (Edge f : eq) {
                if (f.maxX < e.minX || f.minX > e.maxX || f.maxY < e.minY || f.minY > e.maxY) {
                    continue;
                }
                meet(e, f);
            }
        }
        selfCuts(ep, p);
        selfCuts(eq, q);
        float[] out = { Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY, Float.NEGATIVE_INFINITY };
        boolean any = shared(ep, p, q, out);
        any |= shared(eq, q, p, out);
        return any ? out : null;
    }

    /** Cuts e and f where they cross or touch, and notes where they run along each other. */
    private static void meet(Edge e, Edge f) {
        double o1 = orient(f.ax, f.ay, f.bx, f.by, e.ax, e.ay);
        double o2 = orient(f.ax, f.ay, f.bx, f.by, e.bx, e.by);
        double o3 = orient(e.ax, e.ay, e.bx, e.by, f.ax, f.ay);
        double o4 = orient(e.ax, e.ay, e.bx, e.by, f.bx, f.by);
        if (o1 == 0 && o2 == 0) {
            // On one line: they run along each other where their parameters overlap.
            along(e, f);
            along(f, e);
            return;
        }
        if (opposite(o1, o2) && opposite(o3, o4)) {
            double rx = e.bx - e.ax;
            double ry = e.by - e.ay;
            double sx = f.bx - f.ax;
            double sy = f.by - f.ay;
            double denom = rx * sy - ry * sx;
            double qx = f.ax - e.ax;
            double qy = f.ay - e.ay;
            double t = (qx * sy - qy * sx) / denom;
            double u = (qx * ry - qy * rx) / denom;
            double x = e.ax + t * rx;
            double y = e.ay + t * ry;
            e.cut(t, x, y);
            f.cut(u, x, y);
            return;
        }
        // Touching: an end of one on the other.
        if (o3 == 0) {
            touch(e, f.ax, f.ay);
        }
        if (o4 == 0) {
            touch(e, f.bx, f.by);
        }
        if (o1 == 0) {
            touch(f, e.ax, e.ay);
        }
        if (o2 == 0) {
            touch(f, e.bx, e.by);
        }
    }

    /**
     * Cuts the edges of a polygon that isn't simply convex where they cross or touch each other
     * (a polygon crossing itself, or going back along an edge), since its area can change sides
     * there.
     */
    private static void selfCuts(Edge[] edges, double[] poly) {
        if (convex(poly)) {
            return;
        }
        for (int i = 0; i < edges.length; i++) {
            Edge e = edges[i];
            for (int j = i + 1; j < edges.length; j++) {
                Edge f = edges[j];
                double o1 = orient(f.ax, f.ay, f.bx, f.by, e.ax, e.ay);
                double o2 = orient(f.ax, f.ay, f.bx, f.by, e.bx, e.by);
                double o3 = orient(e.ax, e.ay, e.bx, e.by, f.ax, f.ay);
                double o4 = orient(e.ax, e.ay, e.bx, e.by, f.bx, f.by);
                if (opposite(o1, o2) && opposite(o3, o4)) {
                    double rx = e.bx - e.ax;
                    double ry = e.by - e.ay;
                    double sx = f.bx - f.ax;
                    double sy = f.by - f.ay;
                    double denom = rx * sy - ry * sx;
                    double qx = f.ax - e.ax;
                    double qy = f.ay - e.ay;
                    double t = (qx * sy - qy * sx) / denom;
                    double u = (qx * ry - qy * rx) / denom;
                    double x = e.ax + t * rx;
                    double y = e.ay + t * ry;
                    e.cut(t, x, y);
                    f.cut(u, x, y);
                    continue;
                }
                if (o3 == 0) {
                    touch(e, f.ax, f.ay);
                }
                if (o4 == 0) {
                    touch(e, f.bx, f.by);
                }
                if (o1 == 0) {
                    touch(f, e.ax, e.ay);
                }
                if (o2 == 0) {
                    touch(f, e.bx, e.by);
                }
            }
        }
    }

    /** The polygon's points without a point equal to the one before it, nor last points equal to the first. */
    static double[] withoutRepeats(double[] poly) {
        int n = poly.length / 2;
        double[] out = new double[2 * n];
        int m = 0;
        for (int i = 0; i < n; i++) {
            double x = poly[2 * i];
            double y = poly[2 * i + 1];
            if (m > 0 && out[2 * m - 2] == x && out[2 * m - 1] == y) {
                continue;
            }
            out[2 * m] = x;
            out[2 * m + 1] = y;
            m++;
        }
        while (m > 1 && out[2 * m - 2] == out[0] && out[2 * m - 1] == out[1]) {
            m--;
        }
        return m == n ? poly : java.util.Arrays.copyOf(out, 2 * m);
    }

    /**
     * Whether the polygon is convex: it turns the same way at every corner (or goes straight on,
     * never back), and goes round once (its edges go up, then down, once each, and left, then
     * right, once each; a star turns the same way at every corner but goes round twice). A point
     * repeated right after itself (or a last point equal to the first, closing the polygon by
     * hand) is dropped first: next to an edge of length 0 a corner's turn can't be seen, so a
     * concave corner there would otherwise pass for a convex one.
     */
    static boolean convex(double[] points) {
        double[] poly = withoutRepeats(points);
        int n = poly.length / 2;
        if (n < 3) {
            return false;
        }
        int sign = 0;
        int xChanges = 0;
        int yChanges = 0;
        int lastX = 0;
        int lastY = 0;
        int firstX = 0;
        int firstY = 0;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            int k = (i + 2) % n;
            double ax = poly[2 * j] - poly[2 * i];
            double ay = poly[2 * j + 1] - poly[2 * i + 1];
            double bx = poly[2 * k] - poly[2 * j];
            double by = poly[2 * k + 1] - poly[2 * j + 1];
            double o = orient(poly[2 * i], poly[2 * i + 1], poly[2 * j], poly[2 * j + 1], poly[2 * k], poly[2 * k + 1]);
            if (o == 0) {
                if (ax * bx + ay * by < 0) {
                    return false;
                }
            } else {
                int sg = o > 0 ? 1 : -1;
                if (sign != 0 && sg != sign) {
                    return false;
                }
                sign = sg;
            }
            int dx = ax > 0 ? 1 : ax < 0 ? -1 : 0;
            int dy = ay > 0 ? 1 : ay < 0 ? -1 : 0;
            if (dx != 0) {
                if (lastX != 0 && dx != lastX) {
                    xChanges++;
                }
                if (firstX == 0) {
                    firstX = dx;
                }
                lastX = dx;
            }
            if (dy != 0) {
                if (lastY != 0 && dy != lastY) {
                    yChanges++;
                }
                if (firstY == 0) {
                    firstY = dy;
                }
                lastY = dy;
            }
        }
        if (lastX != 0 && firstX != lastX) {
            xChanges++;
        }
        if (lastY != 0 && firstY != lastY) {
            yChanges++;
        }
        return sign != 0 && xChanges <= 2 && yChanges <= 2;
    }

    /** The sign of a polygon's area: 1, -1, or 0 when it has none. */
    private static int areaSign(double[] poly) {
        double sum = 0;
        int n = poly.length / 2;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            sum += poly[2 * i] * poly[2 * j + 1] - poly[2 * j] * poly[2 * i + 1];
        }
        return sum > 0 ? 1 : sum < 0 ? -1 : 0;
    }

    /** Whether an edge of convex polygon p (its area on side sp) has all of q on its other side or on it. */
    private static boolean separates(double[] p, int sp, double[] q) {
        int n = p.length / 2;
        int m = q.length / 2;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            double ax = p[2 * i];
            double ay = p[2 * i + 1];
            double bx = p[2 * j];
            double by = p[2 * j + 1];
            if (ax == bx && ay == by) {
                continue;
            }
            boolean all = true;
            for (int k = 0; k < m; k++) {
                if (orient(ax, ay, bx, by, q[2 * k], q[2 * k + 1]) * sp > 0) {
                    all = false;
                    break;
                }
            }
            if (all) {
                return true;
            }
        }
        return false;
    }

    /** Whether (x, y) is in convex polygon p (its area on side sp), its edges included. */
    private static boolean within(double[] p, int sp, double x, double y) {
        int n = p.length / 2;
        for (int i = 0; i < n; i++) {
            int j = (i + 1) % n;
            if (orient(p[2 * i], p[2 * i + 1], p[2 * j], p[2 * j + 1], x, y) * sp < 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * overlapBox for two convex polygons, quicker: they share an area unless an edge of one has the
     * other on its far side (or on it); the shared area's corners are the corners of each inside the
     * other and the points where their edges cross (worked out as overlapBox works them out).
     */
    private static float[] convexBox(double[] p, double[] q) {
        int sp = areaSign(p);
        int sq = areaSign(q);
        if (sp == 0 || sq == 0 || separates(p, sp, q) || separates(q, sq, p)) {
            return null;
        }
        float[] out = { Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY, Float.NEGATIVE_INFINITY };
        int n = p.length / 2;
        int m = q.length / 2;
        for (int i = 0; i < n; i++) {
            if (within(q, sq, p[2 * i], p[2 * i + 1])) {
                include(out, p[2 * i], p[2 * i + 1]);
            }
        }
        for (int k = 0; k < m; k++) {
            if (within(p, sp, q[2 * k], q[2 * k + 1])) {
                include(out, q[2 * k], q[2 * k + 1]);
            }
        }
        for (int i = 0; i < n; i++) {
            int i2 = (i + 1) % n;
            double eax = p[2 * i];
            double eay = p[2 * i + 1];
            double ebx = p[2 * i2];
            double eby = p[2 * i2 + 1];
            for (int k = 0; k < m; k++) {
                int k2 = (k + 1) % m;
                double fax = q[2 * k];
                double fay = q[2 * k + 1];
                double fbx = q[2 * k2];
                double fby = q[2 * k2 + 1];
                if (opposite(orient(fax, fay, fbx, fby, eax, eay), orient(fax, fay, fbx, fby, ebx, eby)) && opposite(orient(eax, eay, ebx, eby, fax, fay), orient(eax, eay, ebx, eby, fbx, fby))) {
                    double rx = ebx - eax;
                    double ry = eby - eay;
                    double sx = fbx - fax;
                    double sy = fby - fay;
                    double t = ((fax - eax) * sy - (fay - eay) * sx) / (rx * sy - ry * sx);
                    include(out, eax + t * rx, eay + t * ry);
                }
            }
        }
        return out;
    }

    private static void touch(Edge e, double x, double y) {
        double t = e.param(x, y);
        if (t > 0 && t < 1) {
            e.cut(t, x, y);
        }
    }

    private static void along(Edge e, Edge f) {
        double ta = e.param(f.ax, f.ay);
        double tb = e.param(f.bx, f.by);
        double from = Math.max(0, Math.min(ta, tb));
        double to = Math.min(1, Math.max(ta, tb));
        if (to > from) {
            if (from > 0) {
                e.cut(from, ta < tb ? f.ax : f.bx, ta < tb ? f.ay : f.by);
            }
            if (to < 1) {
                e.cut(to, ta < tb ? f.bx : f.ax, ta < tb ? f.by : f.ay);
            }
            e.runsAlong(from, to);
        }
    }

    /**
     * Adds to out the ends of the pieces of own's edges (polygon mine) that are on the outline of
     * the area shared with other. Whether there was one.
     */
    private static boolean shared(Edge[] own, double[] mine, double[] other, float[] out) {
        boolean any = false;
        for (Edge e : own) {
            sort(e.cuts, e.count);
            double dx = e.bx - e.ax;
            double dy = e.by - e.ay;
            // The edge's length in the L1 norm (no square root: Math.sqrt is slow in the browser's interpreter).
            double len = (dx < 0 ? -dx : dx) + (dy < 0 ? -dy : dy);
            for (int i = 0; i + 3 < e.count; i += 3) {
                double t0 = e.cuts[i];
                double t1 = e.cuts[i + 3];
                if (!(t1 > t0)) {
                    continue;
                }
                double tm = (t0 + t1) / 2;
                double mx = e.ax + tm * dx;
                double my = e.ay + tm * dy;
                // A step off the edge, to each side, smaller than anything else that is near.
                double step = 1e-7 * (Math.abs(mx) + Math.abs(my) + len * (t1 - t0) + 1e-30);
                double nx = -dy / len * step;
                double ny = dx / len * step;
                boolean mineLeft = winding(mine, mx + nx, my + ny) != 0;
                boolean mineRight = winding(mine, mx - nx, my - ny) != 0;
                boolean onOutline;
                if (runsAlong(e, tm)) {
                    boolean otherLeft = winding(other, mx + nx, my + ny) != 0;
                    boolean otherRight = winding(other, mx - nx, my - ny) != 0;
                    onOutline = (mineLeft && otherLeft) || (mineRight && otherRight);
                } else {
                    onOutline = (mineLeft || mineRight) && winding(other, mx, my) != 0;
                }
                if (onOutline) {
                    any = true;
                    include(out, e.cuts[i + 1], e.cuts[i + 2]);
                    include(out, e.cuts[i + 4], e.cuts[i + 5]);
                }
            }
        }
        return any;
    }

    private static boolean runsAlong(Edge e, double t) {
        for (int i = 0; i + 1 < e.alongCount; i += 2) {
            if (t > e.along[i] && t < e.along[i + 1]) {
                return true;
            }
        }
        return false;
    }

    private static void include(float[] out, double x, double y) {
        float fx = (float) x;
        float fy = (float) y;
        if (fx < out[0]) {
            out[0] = fx;
        }
        if (fy < out[1]) {
            out[1] = fy;
        }
        if (fx > out[2]) {
            out[2] = fx;
        }
        if (fy > out[3]) {
            out[3] = fy;
        }
    }

    private static double[] box(double[] poly) {
        double[] b = { Double.POSITIVE_INFINITY, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, Double.NEGATIVE_INFINITY };
        for (int i = 0; i + 1 < poly.length; i += 2) {
            b[0] = Math.min(b[0], poly[i]);
            b[1] = Math.min(b[1], poly[i + 1]);
            b[2] = Math.max(b[2], poly[i]);
            b[3] = Math.max(b[3], poly[i + 1]);
        }
        return b;
    }

    /** Sorts the cuts (t, x, y triples) by t (insertion sort: an edge has few). */
    private static void sort(double[] cuts, int count) {
        for (int i = 3; i < count; i += 3) {
            double t = cuts[i];
            double x = cuts[i + 1];
            double y = cuts[i + 2];
            int j = i - 3;
            while (j >= 0 && cuts[j] > t) {
                cuts[j + 3] = cuts[j];
                cuts[j + 4] = cuts[j + 1];
                cuts[j + 5] = cuts[j + 2];
                j -= 3;
            }
            cuts[j + 3] = t;
            cuts[j + 4] = x;
            cuts[j + 5] = y;
        }
    }
}
