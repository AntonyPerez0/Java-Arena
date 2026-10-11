// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

/**
 * Numbers of the animation's frames, kept and written in hundredths (300.12, 45, -0.5): plenty
 * for drawing, short in the JSON, and quick to write in the browser's interpreter, where
 * Double.toString is slow. A number that isn't finite, or is 1e13 or more, is written as the
 * window JSON writes numbers (NaN and the infinities as strings).
 */
final class Hundredths {
    /** The hundredths of a number that is written exactly instead. */
    static final long EXACT = Long.MIN_VALUE;

    private Hundredths() {
    }

    /**
     * The number in hundredths, rounded to the nearest (halves away from 0), or EXACT. Worked out
     * without Math.round, which is slow in the browser's interpreter.
     */
    static long of(double v) {
        if (!(v > -1e13 && v < 1e13)) {
            return EXACT;
        }
        double x = v * 100;
        return (long) (x < 0 ? x - 0.5 : x + 0.5);
    }

    static void write(JsonText out, long h, double v) {
        if (h == EXACT) {
            StringBuilder exact = new StringBuilder();
            WindowJson.number(exact, v);
            out.append(exact.toString());
            return;
        }
        if (h < 0) {
            out.append('-');
            h = -h;
        }
        long whole = h / 100;
        int rest = (int) (h - whole * 100);
        out.append(whole);
        if (rest != 0) {
            out.append('.');
            out.append((char) ('0' + rest / 10));
            if (rest % 10 != 0) {
                out.append((char) ('0' + rest % 10));
            }
        }
    }
}
