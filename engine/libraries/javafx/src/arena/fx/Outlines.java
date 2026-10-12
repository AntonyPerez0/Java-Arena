// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.List;

/**
 * The area a stroke covers, as JavaFX strokes a shape's outline by default: centered on the
 * outline, half the width on each side, with miter joins (a bevel where the miter would be longer
 * than 10 times half the width) and, for a line, square caps. The area is given as pieces (four
 * cornered bands along the edges and the joins between them), each a list of x, y pairs; their
 * union is the stroke.
 */
final class Outlines {
    /** JavaFX's default miter limit. */
    static final double MITER_LIMIT = 10;

    private Outlines() {
    }

    /** The points of a closed (polygon) or open (line) outline without repeats: a point equal to the one before is left out. */
    private static double[] distinct(double[] pts, boolean closed) {
        double[] out = new double[pts.length];
        int n = 0;
        for (int i = 0; i + 1 < pts.length; i += 2) {
            if (n > 0 && out[n - 2] == pts[i] && out[n - 1] == pts[i + 1]) {
                continue;
            }
            out[n++] = pts[i];
            out[n++] = pts[i + 1];
        }
        if (closed && n > 2 && out[0] == out[n - 2] && out[1] == out[n - 1]) {
            n -= 2;
        }
        double[] result = new double[n];
        System.arraycopy(out, 0, result, 0, n);
        return result;
    }

    /**
     * The pieces of the stroke of a polygon (closed) or a line (open, with square caps), hw being
     * half the stroke's width.
     */
    static List<double[]> strokePieces(double[] pts, double hw, boolean closed) {
        List<double[]> pieces = new ArrayList<double[]>();
        double[] p = distinct(pts, closed);
        int n = p.length / 2;
        if (n < 2 || !(hw > 0)) {
            return pieces;
        }
        int edges = closed ? n : n - 1;
        double[] dx = new double[edges];
        double[] dy = new double[edges];
        for (int i = 0; i < edges; i++) {
            int j = (i + 1) % n;
            double ex = p[2 * j] - p[2 * i];
            double ey = p[2 * j + 1] - p[2 * i + 1];
            double len = Math.sqrt(ex * ex + ey * ey);
            dx[i] = ex / len;
            dy[i] = ey / len;
        }
        for (int i = 0; i < edges; i++) {
            int j = (i + 1) % n;
            double ax = p[2 * i];
            double ay = p[2 * i + 1];
            double bx = p[2 * j];
            double by = p[2 * j + 1];
            if (!closed) {
                // Square caps: the band goes on by half the width past each end.
                if (i == 0) {
                    ax -= hw * dx[i];
                    ay -= hw * dy[i];
                }
                if (i == edges - 1) {
                    bx += hw * dx[i];
                    by += hw * dy[i];
                }
            }
            double nx = -dy[i] * hw;
            double ny = dx[i] * hw;
            pieces.add(new double[] { ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny });
        }
        int first = closed ? 0 : 1;
        int last = closed ? n - 1 : n - 2;
        for (int v = first; v <= last; v++) {
            int in = (v - 1 + edges) % edges;
            int out = v % edges;
            double cross = dx[in] * dy[out] - dy[in] * dx[out];
            double dot = dx[in] * dx[out] + dy[in] * dy[out];
            if (cross == 0) {
                // Straight on (no corner), or turning back (a miter that long is a bevel, which covers nothing more).
                continue;
            }
            double s = cross > 0 ? -hw : hw;
            double vx = p[2 * v];
            double vy = p[2 * v + 1];
            double n1x = -dy[in] * s;
            double n1y = dx[in] * s;
            double n2x = -dy[out] * s;
            double n2y = dx[out] * s;
            double ratio = Math.sqrt(2 / (1 + dot));
            if (ratio <= MITER_LIMIT) {
                double tipX = vx + (n1x + n2x) / (1 + dot);
                double tipY = vy + (n1y + n2y) / (1 + dot);
                pieces.add(new double[] { vx, vy, vx + n1x, vy + n1y, tipX, tipY, vx + n2x, vy + n2y });
            } else {
                pieces.add(new double[] { vx, vy, vx + n1x, vy + n1y, vx + n2x, vy + n2y });
            }
        }
        return pieces;
    }

    /** Every corner of the stroke's pieces of a closed polygon, as x, y pairs (for its bounds). */
    static double[] strokeOutline(double[] pts, double hw) {
        List<double[]> pieces = strokePieces(pts, hw, true);
        int count = 0;
        for (double[] piece : pieces) {
            count += piece.length;
        }
        double[] all = new double[count];
        int k = 0;
        for (double[] piece : pieces) {
            System.arraycopy(piece, 0, all, k, piece.length);
            k += piece.length;
        }
        return all;
    }
}
