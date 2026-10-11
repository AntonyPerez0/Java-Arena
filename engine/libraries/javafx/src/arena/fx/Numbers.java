// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

/** Numbers in the library's messages, as the outline writes them: as Java writes a double, without a trailing .0 (10, 2.5). */
final class Numbers {
    private Numbers() {
    }

    static String plain(double v) {
        String s = Double.toString(v);
        return s.endsWith(".0") ? s.substring(0, s.length() - 2) : s;
    }
}
