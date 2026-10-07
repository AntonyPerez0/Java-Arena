// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.text;

/**
 * A font: a name, a family and a size in points. The default font is "System Regular" of the
 * family "System", 13 points, as JavaFX 21 reports it.
 *
 * <p>JavaFX's own families, which every computer has, follow JavaFX's rules: System, Serif,
 * SansSerif and Monospaced (any case; Dialog and sans-serif are SansSerif, DialogInput and
 * monospace are Monospaced). {@code Font.font("serif", 20)} is "Serif Regular" of the family
 * Serif, and {@code new Font(name, size)} takes a full name such as "Serif Bold" ("Regular",
 * "Bold", "Italic" or "Bold Italic" after the family); a name or family that starts with one of
 * these families but isn't one of these forms (such as {@code new Font("Serif", 20)}, which is a
 * family, not a full name) gives the System font, as in JavaFX. Java Arena doesn't look other
 * fonts up on a computer: a font asked for by another name or family keeps that name and family
 * (as on a computer that has the font; real JavaFX gives the System font where it's missing), and
 * the page draws it with the browser's font of that name.
 */
public class Font {
    private static final String SYSTEM = "System";
    private static final String SYSTEM_REGULAR = "System Regular";
    private static final double DEFAULT_SIZE = 13.0;
    private static final Font DEFAULT = new Font(SYSTEM_REGULAR, SYSTEM, "Regular", DEFAULT_SIZE);

    private final String name;
    private final String family;
    private final String style;
    private final double size;
    private int hash;

    private Font(String name, String family, String style, double size) {
        this.name = name;
        this.family = family;
        this.style = style;
        this.size = size;
    }

    /** The system font in the given size. */
    public Font(double size) {
        this(null, size);
    }

    /** The font with this full name, such as "System Bold" (null: the system font). A negative size gives the default size. */
    public Font(String name, double size) {
        this.size = size < 0 ? DEFAULT_SIZE : size;
        String[] found = byName(name);
        this.name = found[0];
        this.family = found[1];
        this.style = found[2];
    }

    /** The JavaFX family of a family name every computer has (in any case), or null. */
    private static String logicalFamily(String name) {
        switch (name.toLowerCase(java.util.Locale.ROOT)) {
            case "system":
                return SYSTEM;
            case "serif":
                return "Serif";
            case "sansserif":
            case "sans-serif":
            case "dialog":
                return "SansSerif";
            case "monospaced":
            case "monospace":
            case "dialoginput":
                return "Monospaced";
            default:
                return null;
        }
    }

    /** The style of a full name after its family, as JavaFX writes it, or null. */
    private static String logicalStyle(String style) {
        switch (style.toLowerCase(java.util.Locale.ROOT)) {
            case "regular":
                return "Regular";
            case "bold":
                return "Bold";
            case "italic":
                return "Italic";
            case "bold italic":
                return "Bold Italic";
            default:
                return null;
        }
    }

    /** Whether a name starts with one of JavaFX's own families, so JavaFX decides it on every computer. */
    private static boolean looksLogical(String name) {
        String trimmed = name.trim();
        int end = 0;
        while (end < trimmed.length() && trimmed.charAt(end) > ' ') {
            end++;
        }
        return logicalFamily(trimmed.substring(0, end)) != null;
    }

    /** { name, family, style } of the font with this full name. */
    private static String[] byName(String name) {
        if (name == null || name.isEmpty() || name.equalsIgnoreCase(SYSTEM)) {
            return new String[] { SYSTEM_REGULAR, SYSTEM, "Regular" };
        }
        int space = name.indexOf(' ');
        if (space > 0) {
            String family = logicalFamily(name.substring(0, space));
            String style = logicalStyle(name.substring(space + 1));
            if (family != null && style != null) {
                return new String[] { family + " " + style, family, style };
            }
        }
        if (looksLogical(name)) {
            return new String[] { SYSTEM_REGULAR, SYSTEM, "Regular" };
        }
        return new String[] { name, name, "Regular" };
    }

    /** The default font: System Regular, 13 points. */
    public static Font getDefault() {
        return DEFAULT;
    }

    /** The system font in the given size. */
    public static Font font(double size) {
        return new Font(null, size);
    }

    /** The regular font of the given family (null or empty: the system font) in the given size. */
    public static Font font(String family, double size) {
        double s = size < 0 ? DEFAULT_SIZE : size;
        if (family == null || family.isEmpty()) {
            return new Font(SYSTEM_REGULAR, SYSTEM, "Regular", s);
        }
        String logical = logicalFamily(family);
        if (logical != null) {
            return new Font(logical + " Regular", logical, "Regular", s);
        }
        if (looksLogical(family)) {
            return new Font(SYSTEM_REGULAR, SYSTEM, "Regular", s);
        }
        return new Font(family, family, "Regular", s);
    }

    /** The full name of the font, such as "System Regular". */
    public final String getName() {
        return name;
    }

    /** The family of the font, such as "System". */
    public final String getFamily() {
        return family;
    }

    /** The size of the font in points. */
    public final double getSize() {
        return size;
    }

    /** Fonts are equal when their names and sizes are, as in JavaFX. */
    @Override
    public boolean equals(Object other) {
        if (other == this) {
            return true;
        }
        if (!(other instanceof Font)) {
            return false;
        }
        Font o = (Font) other;
        return name.equals(o.name) && size == o.size;
    }

    /** The same hash code JavaFX 21 gives for a font of this name and size. */
    @Override
    public int hashCode() {
        if (hash == 0) {
            long bits = 17L;
            bits = 37L * bits + name.hashCode();
            bits = 37L * bits + Double.doubleToLongBits(size);
            hash = (int) (bits ^ (bits >> 32));
        }
        return hash;
    }

    @Override
    public String toString() {
        return "Font[name=" + name + ", family=" + family + ", style=" + style + ", size=" + size + "]";
    }
}
