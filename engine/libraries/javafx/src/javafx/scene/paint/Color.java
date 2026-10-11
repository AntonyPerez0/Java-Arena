// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.paint;

import java.util.Locale;

/**
 * A color: red, green, blue and opacity, each from 0.0 to 1.0, kept as float values as JavaFX keeps
 * them (so getRed() of Color.color(0.1, 0, 0) is 0.10000000149011612). Every named color of JavaFX
 * (the CSS colors, such as RED, DARKGREEN and TRANSPARENT) has the same value as there; brighter(),
 * darker(), grayscale() and invert() give the same colors as JavaFX 21, and web(...) reads the same
 * texts. toString() writes the color as 0xrrggbbaa.
 */
public final class Color extends Paint {
    private static final double BRIGHTER_DARKER = 0.7;

    private final float red;
    private final float green;
    private final float blue;
    private final float opacity;

    /** Fully transparent: no color at all (0x00000000). */
    public static final Color TRANSPARENT = new Color(0, 0, 0, 0);
    /** 0xf0f8ff. */
    public static final Color ALICEBLUE = named(0xf0f8ff);
    /** 0xfaebd7. */
    public static final Color ANTIQUEWHITE = named(0xfaebd7);
    /** 0x00ffff. */
    public static final Color AQUA = named(0x00ffff);
    /** 0x7fffd4. */
    public static final Color AQUAMARINE = named(0x7fffd4);
    /** 0xf0ffff. */
    public static final Color AZURE = named(0xf0ffff);
    /** 0xf5f5dc. */
    public static final Color BEIGE = named(0xf5f5dc);
    /** 0xffe4c4. */
    public static final Color BISQUE = named(0xffe4c4);
    /** 0x000000. */
    public static final Color BLACK = named(0x000000);
    /** 0xffebcd. */
    public static final Color BLANCHEDALMOND = named(0xffebcd);
    /** 0x0000ff. */
    public static final Color BLUE = named(0x0000ff);
    /** 0x8a2be2. */
    public static final Color BLUEVIOLET = named(0x8a2be2);
    /** 0xa52a2a. */
    public static final Color BROWN = named(0xa52a2a);
    /** 0xdeb887. */
    public static final Color BURLYWOOD = named(0xdeb887);
    /** 0x5f9ea0. */
    public static final Color CADETBLUE = named(0x5f9ea0);
    /** 0x7fff00. */
    public static final Color CHARTREUSE = named(0x7fff00);
    /** 0xd2691e. */
    public static final Color CHOCOLATE = named(0xd2691e);
    /** 0xff7f50. */
    public static final Color CORAL = named(0xff7f50);
    /** 0x6495ed. */
    public static final Color CORNFLOWERBLUE = named(0x6495ed);
    /** 0xfff8dc. */
    public static final Color CORNSILK = named(0xfff8dc);
    /** 0xdc143c. */
    public static final Color CRIMSON = named(0xdc143c);
    /** 0x00ffff. */
    public static final Color CYAN = named(0x00ffff);
    /** 0x00008b. */
    public static final Color DARKBLUE = named(0x00008b);
    /** 0x008b8b. */
    public static final Color DARKCYAN = named(0x008b8b);
    /** 0xb8860b. */
    public static final Color DARKGOLDENROD = named(0xb8860b);
    /** 0xa9a9a9. */
    public static final Color DARKGRAY = named(0xa9a9a9);
    /** 0x006400. */
    public static final Color DARKGREEN = named(0x006400);
    /** 0xa9a9a9. */
    public static final Color DARKGREY = named(0xa9a9a9);
    /** 0xbdb76b. */
    public static final Color DARKKHAKI = named(0xbdb76b);
    /** 0x8b008b. */
    public static final Color DARKMAGENTA = named(0x8b008b);
    /** 0x556b2f. */
    public static final Color DARKOLIVEGREEN = named(0x556b2f);
    /** 0xff8c00. */
    public static final Color DARKORANGE = named(0xff8c00);
    /** 0x9932cc. */
    public static final Color DARKORCHID = named(0x9932cc);
    /** 0x8b0000. */
    public static final Color DARKRED = named(0x8b0000);
    /** 0xe9967a. */
    public static final Color DARKSALMON = named(0xe9967a);
    /** 0x8fbc8f. */
    public static final Color DARKSEAGREEN = named(0x8fbc8f);
    /** 0x483d8b. */
    public static final Color DARKSLATEBLUE = named(0x483d8b);
    /** 0x2f4f4f. */
    public static final Color DARKSLATEGRAY = named(0x2f4f4f);
    /** 0x2f4f4f. */
    public static final Color DARKSLATEGREY = named(0x2f4f4f);
    /** 0x00ced1. */
    public static final Color DARKTURQUOISE = named(0x00ced1);
    /** 0x9400d3. */
    public static final Color DARKVIOLET = named(0x9400d3);
    /** 0xff1493. */
    public static final Color DEEPPINK = named(0xff1493);
    /** 0x00bfff. */
    public static final Color DEEPSKYBLUE = named(0x00bfff);
    /** 0x696969. */
    public static final Color DIMGRAY = named(0x696969);
    /** 0x696969. */
    public static final Color DIMGREY = named(0x696969);
    /** 0x1e90ff. */
    public static final Color DODGERBLUE = named(0x1e90ff);
    /** 0xb22222. */
    public static final Color FIREBRICK = named(0xb22222);
    /** 0xfffaf0. */
    public static final Color FLORALWHITE = named(0xfffaf0);
    /** 0x228b22. */
    public static final Color FORESTGREEN = named(0x228b22);
    /** 0xff00ff. */
    public static final Color FUCHSIA = named(0xff00ff);
    /** 0xdcdcdc. */
    public static final Color GAINSBORO = named(0xdcdcdc);
    /** 0xf8f8ff. */
    public static final Color GHOSTWHITE = named(0xf8f8ff);
    /** 0xffd700. */
    public static final Color GOLD = named(0xffd700);
    /** 0xdaa520. */
    public static final Color GOLDENROD = named(0xdaa520);
    /** 0x808080. */
    public static final Color GRAY = named(0x808080);
    /** 0x008000. */
    public static final Color GREEN = named(0x008000);
    /** 0xadff2f. */
    public static final Color GREENYELLOW = named(0xadff2f);
    /** 0x808080. */
    public static final Color GREY = named(0x808080);
    /** 0xf0fff0. */
    public static final Color HONEYDEW = named(0xf0fff0);
    /** 0xff69b4. */
    public static final Color HOTPINK = named(0xff69b4);
    /** 0xcd5c5c. */
    public static final Color INDIANRED = named(0xcd5c5c);
    /** 0x4b0082. */
    public static final Color INDIGO = named(0x4b0082);
    /** 0xfffff0. */
    public static final Color IVORY = named(0xfffff0);
    /** 0xf0e68c. */
    public static final Color KHAKI = named(0xf0e68c);
    /** 0xe6e6fa. */
    public static final Color LAVENDER = named(0xe6e6fa);
    /** 0xfff0f5. */
    public static final Color LAVENDERBLUSH = named(0xfff0f5);
    /** 0x7cfc00. */
    public static final Color LAWNGREEN = named(0x7cfc00);
    /** 0xfffacd. */
    public static final Color LEMONCHIFFON = named(0xfffacd);
    /** 0xadd8e6. */
    public static final Color LIGHTBLUE = named(0xadd8e6);
    /** 0xf08080. */
    public static final Color LIGHTCORAL = named(0xf08080);
    /** 0xe0ffff. */
    public static final Color LIGHTCYAN = named(0xe0ffff);
    /** 0xfafad2. */
    public static final Color LIGHTGOLDENRODYELLOW = named(0xfafad2);
    /** 0xd3d3d3. */
    public static final Color LIGHTGRAY = named(0xd3d3d3);
    /** 0x90ee90. */
    public static final Color LIGHTGREEN = named(0x90ee90);
    /** 0xd3d3d3. */
    public static final Color LIGHTGREY = named(0xd3d3d3);
    /** 0xffb6c1. */
    public static final Color LIGHTPINK = named(0xffb6c1);
    /** 0xffa07a. */
    public static final Color LIGHTSALMON = named(0xffa07a);
    /** 0x20b2aa. */
    public static final Color LIGHTSEAGREEN = named(0x20b2aa);
    /** 0x87cefa. */
    public static final Color LIGHTSKYBLUE = named(0x87cefa);
    /** 0x778899. */
    public static final Color LIGHTSLATEGRAY = named(0x778899);
    /** 0x778899. */
    public static final Color LIGHTSLATEGREY = named(0x778899);
    /** 0xb0c4de. */
    public static final Color LIGHTSTEELBLUE = named(0xb0c4de);
    /** 0xffffe0. */
    public static final Color LIGHTYELLOW = named(0xffffe0);
    /** 0x00ff00. */
    public static final Color LIME = named(0x00ff00);
    /** 0x32cd32. */
    public static final Color LIMEGREEN = named(0x32cd32);
    /** 0xfaf0e6. */
    public static final Color LINEN = named(0xfaf0e6);
    /** 0xff00ff. */
    public static final Color MAGENTA = named(0xff00ff);
    /** 0x800000. */
    public static final Color MAROON = named(0x800000);
    /** 0x66cdaa. */
    public static final Color MEDIUMAQUAMARINE = named(0x66cdaa);
    /** 0x0000cd. */
    public static final Color MEDIUMBLUE = named(0x0000cd);
    /** 0xba55d3. */
    public static final Color MEDIUMORCHID = named(0xba55d3);
    /** 0x9370db. */
    public static final Color MEDIUMPURPLE = named(0x9370db);
    /** 0x3cb371. */
    public static final Color MEDIUMSEAGREEN = named(0x3cb371);
    /** 0x7b68ee. */
    public static final Color MEDIUMSLATEBLUE = named(0x7b68ee);
    /** 0x00fa9a. */
    public static final Color MEDIUMSPRINGGREEN = named(0x00fa9a);
    /** 0x48d1cc. */
    public static final Color MEDIUMTURQUOISE = named(0x48d1cc);
    /** 0xc71585. */
    public static final Color MEDIUMVIOLETRED = named(0xc71585);
    /** 0x191970. */
    public static final Color MIDNIGHTBLUE = named(0x191970);
    /** 0xf5fffa. */
    public static final Color MINTCREAM = named(0xf5fffa);
    /** 0xffe4e1. */
    public static final Color MISTYROSE = named(0xffe4e1);
    /** 0xffe4b5. */
    public static final Color MOCCASIN = named(0xffe4b5);
    /** 0xffdead. */
    public static final Color NAVAJOWHITE = named(0xffdead);
    /** 0x000080. */
    public static final Color NAVY = named(0x000080);
    /** 0xfdf5e6. */
    public static final Color OLDLACE = named(0xfdf5e6);
    /** 0x808000. */
    public static final Color OLIVE = named(0x808000);
    /** 0x6b8e23. */
    public static final Color OLIVEDRAB = named(0x6b8e23);
    /** 0xffa500. */
    public static final Color ORANGE = named(0xffa500);
    /** 0xff4500. */
    public static final Color ORANGERED = named(0xff4500);
    /** 0xda70d6. */
    public static final Color ORCHID = named(0xda70d6);
    /** 0xeee8aa. */
    public static final Color PALEGOLDENROD = named(0xeee8aa);
    /** 0x98fb98. */
    public static final Color PALEGREEN = named(0x98fb98);
    /** 0xafeeee. */
    public static final Color PALETURQUOISE = named(0xafeeee);
    /** 0xdb7093. */
    public static final Color PALEVIOLETRED = named(0xdb7093);
    /** 0xffefd5. */
    public static final Color PAPAYAWHIP = named(0xffefd5);
    /** 0xffdab9. */
    public static final Color PEACHPUFF = named(0xffdab9);
    /** 0xcd853f. */
    public static final Color PERU = named(0xcd853f);
    /** 0xffc0cb. */
    public static final Color PINK = named(0xffc0cb);
    /** 0xdda0dd. */
    public static final Color PLUM = named(0xdda0dd);
    /** 0xb0e0e6. */
    public static final Color POWDERBLUE = named(0xb0e0e6);
    /** 0x800080. */
    public static final Color PURPLE = named(0x800080);
    /** 0xff0000. */
    public static final Color RED = named(0xff0000);
    /** 0xbc8f8f. */
    public static final Color ROSYBROWN = named(0xbc8f8f);
    /** 0x4169e1. */
    public static final Color ROYALBLUE = named(0x4169e1);
    /** 0x8b4513. */
    public static final Color SADDLEBROWN = named(0x8b4513);
    /** 0xfa8072. */
    public static final Color SALMON = named(0xfa8072);
    /** 0xf4a460. */
    public static final Color SANDYBROWN = named(0xf4a460);
    /** 0x2e8b57. */
    public static final Color SEAGREEN = named(0x2e8b57);
    /** 0xfff5ee. */
    public static final Color SEASHELL = named(0xfff5ee);
    /** 0xa0522d. */
    public static final Color SIENNA = named(0xa0522d);
    /** 0xc0c0c0. */
    public static final Color SILVER = named(0xc0c0c0);
    /** 0x87ceeb. */
    public static final Color SKYBLUE = named(0x87ceeb);
    /** 0x6a5acd. */
    public static final Color SLATEBLUE = named(0x6a5acd);
    /** 0x708090. */
    public static final Color SLATEGRAY = named(0x708090);
    /** 0x708090. */
    public static final Color SLATEGREY = named(0x708090);
    /** 0xfffafa. */
    public static final Color SNOW = named(0xfffafa);
    /** 0x00ff7f. */
    public static final Color SPRINGGREEN = named(0x00ff7f);
    /** 0x4682b4. */
    public static final Color STEELBLUE = named(0x4682b4);
    /** 0xd2b48c. */
    public static final Color TAN = named(0xd2b48c);
    /** 0x008080. */
    public static final Color TEAL = named(0x008080);
    /** 0xd8bfd8. */
    public static final Color THISTLE = named(0xd8bfd8);
    /** 0xff6347. */
    public static final Color TOMATO = named(0xff6347);
    /** 0x40e0d0. */
    public static final Color TURQUOISE = named(0x40e0d0);
    /** 0xee82ee. */
    public static final Color VIOLET = named(0xee82ee);
    /** 0xf5deb3. */
    public static final Color WHEAT = named(0xf5deb3);
    /** 0xffffff. */
    public static final Color WHITE = named(0xffffff);
    /** 0xf5f5f5. */
    public static final Color WHITESMOKE = named(0xf5f5f5);
    /** 0xffff00. */
    public static final Color YELLOW = named(0xffff00);
    /** 0x9acd32. */
    public static final Color YELLOWGREEN = named(0x9acd32);

    /** A color from its red, green, blue and opacity, each from 0.0 to 1.0. */
    public Color(double red, double green, double blue, double opacity) {
        check("red", red);
        check("green", green);
        check("blue", blue);
        check("opacity", opacity);
        this.red = (float) red;
        this.green = (float) green;
        this.blue = (float) blue;
        this.opacity = (float) opacity;
    }

    private static void check(String what, double value) {
        if (value < 0 || value > 1) {
            throw new IllegalArgumentException("Color's " + what + " value (" + value + ") must be in the range 0.0-1.0");
        }
    }

    private static Color named(int rgb) {
        return new Color(((rgb >> 16) & 0xff) / 255.0, ((rgb >> 8) & 0xff) / 255.0, (rgb & 0xff) / 255.0, 1.0);
    }

    /** An opaque color from red, green and blue, each from 0.0 to 1.0. */
    public static Color color(double red, double green, double blue) {
        return new Color(red, green, blue, 1.0);
    }

    /** A color from red, green, blue and opacity, each from 0.0 to 1.0. */
    public static Color color(double red, double green, double blue, double opacity) {
        return new Color(red, green, blue, opacity);
    }

    /** An opaque color from red, green and blue, each from 0 to 255. */
    public static Color rgb(int red, int green, int blue) {
        return rgb(red, green, blue, 1.0);
    }

    /** A color from red, green and blue (each from 0 to 255) and opacity (from 0.0 to 1.0). */
    public static Color rgb(int red, int green, int blue, double opacity) {
        checkByte("red", red);
        checkByte("green", green);
        checkByte("blue", blue);
        return new Color(red / 255.0, green / 255.0, blue / 255.0, opacity);
    }

    private static void checkByte(String what, int value) {
        if (value < 0 || value > 255) {
            throw new IllegalArgumentException("Color.rgb's " + what + " parameter (" + value + ") expects color values 0-255");
        }
    }

    /**
     * The color a web page would write: a name ("red", "darkgreen", any case), #rgb, #rgba,
     * #rrggbb, #rrggbbaa (also without # or with 0x before the digits), rgb(r, g, b),
     * rgba(r, g, b, a), and as in JavaFX hsl(h, s%, b%) and hsla(h, s%, b%, a), where JavaFX reads
     * the third number as a brightness. Anything else throws IllegalArgumentException.
     */
    public static Color web(String colorString) {
        return web(colorString, 1.0);
    }

    private static Color web(String colorString, double opacity) {
        if (colorString == null) {
            throw new NullPointerException("The color components or name must be specified");
        }
        if (colorString.isEmpty()) {
            throw invalid();
        }
        String text = colorString.toLowerCase(Locale.ROOT);
        String digits;
        if (text.startsWith("#")) {
            digits = text.substring(1);
        } else if (text.startsWith("0x")) {
            digits = text.substring(2);
        } else if (text.startsWith("rgb(") || text.startsWith("rgba(") || text.startsWith("hsl(") || text.startsWith("hsla(")) {
            return functional(text, opacity);
        } else {
            Color known = byName(text);
            if (known != null) {
                return opacity == 1.0 ? known : color(known.red, known.green, known.blue, opacity);
            }
            digits = text;
        }
        try {
            switch (digits.length()) {
                case 3:
                    return color(hex(digits, 0, 1) / 15.0, hex(digits, 1, 2) / 15.0, hex(digits, 2, 3) / 15.0, opacity);
                case 4:
                    return color(hex(digits, 0, 1) / 15.0, hex(digits, 1, 2) / 15.0, hex(digits, 2, 3) / 15.0, opacity * hex(digits, 3, 4) / 15.0);
                case 6:
                    return rgb(hex(digits, 0, 2), hex(digits, 2, 4), hex(digits, 4, 6), opacity);
                case 8:
                    return rgb(hex(digits, 0, 2), hex(digits, 2, 4), hex(digits, 4, 6), opacity * hex(digits, 6, 8) / 255.0);
                default:
                    throw invalid();
            }
        } catch (NumberFormatException e) {
            throw invalid();
        }
    }

    private static int hex(String digits, int from, int to) {
        return Integer.parseInt(digits.substring(from, to), 16);
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Invalid color specification");
    }

    /** rgb(...), rgba(...), hsl(...) or hsla(...): the parts between commas up to the closing parenthesis (what follows it is ignored). */
    private static Color functional(String text, double opacity) {
        boolean hsl = text.startsWith("hsl");
        boolean alpha = text.charAt(3) == 'a';
        int at = text.indexOf('(') + 1;
        String[] parts = new String[alpha ? 4 : 3];
        for (int i = 0; i < parts.length; i++) {
            int end = text.indexOf(i == parts.length - 1 ? ')' : ',', at);
            if (end < 0) {
                throw invalid();
            }
            parts[i] = text.substring(at, end);
            at = end + 1;
        }
        try {
            double a = alpha ? opacity * part(parts[3], ALPHA) : opacity;
            if (hsl) {
                return hsb(part(parts[0], ANGLE), part(parts[1], PERCENT), part(parts[2], PERCENT), a);
            }
            return new Color(part(parts[0], BYTE_OR_PERCENT), part(parts[1], BYTE_OR_PERCENT), part(parts[2], BYTE_OR_PERCENT), a);
        } catch (NumberFormatException e) {
            throw invalid();
        }
    }

    private static final int BYTE_OR_PERCENT = 0;
    private static final int PERCENT = 1;
    private static final int ANGLE = 2;
    private static final int ALPHA = 3;

    /** One number of rgb(...) or hsl(...): a whole number from 0 to 255 or a percentage (clamped), an angle in degrees, or an opacity (clamped). */
    private static double part(String raw, int kind) {
        String s = raw.trim();
        boolean percent = s.endsWith("%");
        if (percent) {
            if (kind == ANGLE || kind == ALPHA) {
                throw invalid();
            }
            double v = Double.parseDouble(s.substring(0, s.length() - 1).trim());
            return v <= 0 ? 0 : v >= 100 ? 1 : v / 100;
        }
        if (kind == PERCENT) {
            throw invalid();
        }
        if (kind == BYTE_OR_PERCENT) {
            int v = Integer.parseInt(s);
            return v <= 0 ? 0 : v >= 255 ? 1 : v / 255.0;
        }
        double v = Double.parseDouble(s);
        if (kind == ALPHA) {
            return v < 0 ? 0 : v > 1 ? 1 : v;
        }
        return v < 0 ? v % 360 + 360 : v > 360 ? v % 360 : v;
    }

    /** The named color with this name (in small letters), or null. */
    private static Color byName(String name) {
        switch (name) {
            case "transparent":
                return TRANSPARENT;
            case "aliceblue":
                return ALICEBLUE;
            case "antiquewhite":
                return ANTIQUEWHITE;
            case "aqua":
                return AQUA;
            case "aquamarine":
                return AQUAMARINE;
            case "azure":
                return AZURE;
            case "beige":
                return BEIGE;
            case "bisque":
                return BISQUE;
            case "black":
                return BLACK;
            case "blanchedalmond":
                return BLANCHEDALMOND;
            case "blue":
                return BLUE;
            case "blueviolet":
                return BLUEVIOLET;
            case "brown":
                return BROWN;
            case "burlywood":
                return BURLYWOOD;
            case "cadetblue":
                return CADETBLUE;
            case "chartreuse":
                return CHARTREUSE;
            case "chocolate":
                return CHOCOLATE;
            case "coral":
                return CORAL;
            case "cornflowerblue":
                return CORNFLOWERBLUE;
            case "cornsilk":
                return CORNSILK;
            case "crimson":
                return CRIMSON;
            case "cyan":
                return CYAN;
            case "darkblue":
                return DARKBLUE;
            case "darkcyan":
                return DARKCYAN;
            case "darkgoldenrod":
                return DARKGOLDENROD;
            case "darkgray":
                return DARKGRAY;
            case "darkgreen":
                return DARKGREEN;
            case "darkgrey":
                return DARKGREY;
            case "darkkhaki":
                return DARKKHAKI;
            case "darkmagenta":
                return DARKMAGENTA;
            case "darkolivegreen":
                return DARKOLIVEGREEN;
            case "darkorange":
                return DARKORANGE;
            case "darkorchid":
                return DARKORCHID;
            case "darkred":
                return DARKRED;
            case "darksalmon":
                return DARKSALMON;
            case "darkseagreen":
                return DARKSEAGREEN;
            case "darkslateblue":
                return DARKSLATEBLUE;
            case "darkslategray":
                return DARKSLATEGRAY;
            case "darkslategrey":
                return DARKSLATEGREY;
            case "darkturquoise":
                return DARKTURQUOISE;
            case "darkviolet":
                return DARKVIOLET;
            case "deeppink":
                return DEEPPINK;
            case "deepskyblue":
                return DEEPSKYBLUE;
            case "dimgray":
                return DIMGRAY;
            case "dimgrey":
                return DIMGREY;
            case "dodgerblue":
                return DODGERBLUE;
            case "firebrick":
                return FIREBRICK;
            case "floralwhite":
                return FLORALWHITE;
            case "forestgreen":
                return FORESTGREEN;
            case "fuchsia":
                return FUCHSIA;
            case "gainsboro":
                return GAINSBORO;
            case "ghostwhite":
                return GHOSTWHITE;
            case "gold":
                return GOLD;
            case "goldenrod":
                return GOLDENROD;
            case "gray":
                return GRAY;
            case "green":
                return GREEN;
            case "greenyellow":
                return GREENYELLOW;
            case "grey":
                return GREY;
            case "honeydew":
                return HONEYDEW;
            case "hotpink":
                return HOTPINK;
            case "indianred":
                return INDIANRED;
            case "indigo":
                return INDIGO;
            case "ivory":
                return IVORY;
            case "khaki":
                return KHAKI;
            case "lavender":
                return LAVENDER;
            case "lavenderblush":
                return LAVENDERBLUSH;
            case "lawngreen":
                return LAWNGREEN;
            case "lemonchiffon":
                return LEMONCHIFFON;
            case "lightblue":
                return LIGHTBLUE;
            case "lightcoral":
                return LIGHTCORAL;
            case "lightcyan":
                return LIGHTCYAN;
            case "lightgoldenrodyellow":
                return LIGHTGOLDENRODYELLOW;
            case "lightgray":
                return LIGHTGRAY;
            case "lightgreen":
                return LIGHTGREEN;
            case "lightgrey":
                return LIGHTGREY;
            case "lightpink":
                return LIGHTPINK;
            case "lightsalmon":
                return LIGHTSALMON;
            case "lightseagreen":
                return LIGHTSEAGREEN;
            case "lightskyblue":
                return LIGHTSKYBLUE;
            case "lightslategray":
                return LIGHTSLATEGRAY;
            case "lightslategrey":
                return LIGHTSLATEGREY;
            case "lightsteelblue":
                return LIGHTSTEELBLUE;
            case "lightyellow":
                return LIGHTYELLOW;
            case "lime":
                return LIME;
            case "limegreen":
                return LIMEGREEN;
            case "linen":
                return LINEN;
            case "magenta":
                return MAGENTA;
            case "maroon":
                return MAROON;
            case "mediumaquamarine":
                return MEDIUMAQUAMARINE;
            case "mediumblue":
                return MEDIUMBLUE;
            case "mediumorchid":
                return MEDIUMORCHID;
            case "mediumpurple":
                return MEDIUMPURPLE;
            case "mediumseagreen":
                return MEDIUMSEAGREEN;
            case "mediumslateblue":
                return MEDIUMSLATEBLUE;
            case "mediumspringgreen":
                return MEDIUMSPRINGGREEN;
            case "mediumturquoise":
                return MEDIUMTURQUOISE;
            case "mediumvioletred":
                return MEDIUMVIOLETRED;
            case "midnightblue":
                return MIDNIGHTBLUE;
            case "mintcream":
                return MINTCREAM;
            case "mistyrose":
                return MISTYROSE;
            case "moccasin":
                return MOCCASIN;
            case "navajowhite":
                return NAVAJOWHITE;
            case "navy":
                return NAVY;
            case "oldlace":
                return OLDLACE;
            case "olive":
                return OLIVE;
            case "olivedrab":
                return OLIVEDRAB;
            case "orange":
                return ORANGE;
            case "orangered":
                return ORANGERED;
            case "orchid":
                return ORCHID;
            case "palegoldenrod":
                return PALEGOLDENROD;
            case "palegreen":
                return PALEGREEN;
            case "paleturquoise":
                return PALETURQUOISE;
            case "palevioletred":
                return PALEVIOLETRED;
            case "papayawhip":
                return PAPAYAWHIP;
            case "peachpuff":
                return PEACHPUFF;
            case "peru":
                return PERU;
            case "pink":
                return PINK;
            case "plum":
                return PLUM;
            case "powderblue":
                return POWDERBLUE;
            case "purple":
                return PURPLE;
            case "red":
                return RED;
            case "rosybrown":
                return ROSYBROWN;
            case "royalblue":
                return ROYALBLUE;
            case "saddlebrown":
                return SADDLEBROWN;
            case "salmon":
                return SALMON;
            case "sandybrown":
                return SANDYBROWN;
            case "seagreen":
                return SEAGREEN;
            case "seashell":
                return SEASHELL;
            case "sienna":
                return SIENNA;
            case "silver":
                return SILVER;
            case "skyblue":
                return SKYBLUE;
            case "slateblue":
                return SLATEBLUE;
            case "slategray":
                return SLATEGRAY;
            case "slategrey":
                return SLATEGREY;
            case "snow":
                return SNOW;
            case "springgreen":
                return SPRINGGREEN;
            case "steelblue":
                return STEELBLUE;
            case "tan":
                return TAN;
            case "teal":
                return TEAL;
            case "thistle":
                return THISTLE;
            case "tomato":
                return TOMATO;
            case "turquoise":
                return TURQUOISE;
            case "violet":
                return VIOLET;
            case "wheat":
                return WHEAT;
            case "white":
                return WHITE;
            case "whitesmoke":
                return WHITESMOKE;
            case "yellow":
                return YELLOW;
            case "yellowgreen":
                return YELLOWGREEN;
            default:
                return null;
        }
    }

    // ------------------------------------------------------------------ hue, saturation, brightness

    /** A color from hue (degrees), saturation and brightness (0.0 to 1.0) and opacity. */
    private static Color hsb(double hue, double saturation, double brightness, double opacity) {
        double h = (hue % 360 + 360) % 360 / 360;
        double r;
        double g;
        double b;
        if (saturation == 0) {
            r = brightness;
            g = brightness;
            b = brightness;
        } else {
            double sector = (h - Math.floor(h)) * 6.0;
            double f = sector - Math.floor(sector);
            double p = brightness * (1.0 - saturation);
            double q = brightness * (1.0 - saturation * f);
            double t = brightness * (1.0 - (saturation * (1.0 - f)));
            switch ((int) sector) {
                case 0:
                    r = brightness;
                    g = t;
                    b = p;
                    break;
                case 1:
                    r = q;
                    g = brightness;
                    b = p;
                    break;
                case 2:
                    r = p;
                    g = brightness;
                    b = t;
                    break;
                case 3:
                    r = p;
                    g = q;
                    b = brightness;
                    break;
                case 4:
                    r = t;
                    g = p;
                    b = brightness;
                    break;
                case 5:
                    r = brightness;
                    g = p;
                    b = q;
                    break;
                default:
                    r = 0;
                    g = 0;
                    b = 0;
            }
        }
        return new Color(r, g, b, opacity);
    }

    /** { hue in degrees, saturation, brightness } of this color. */
    private double[] toHsb() {
        double r = red;
        double g = green;
        double b = blue;
        double max = r > g ? r : g;
        if (b > max) {
            max = b;
        }
        double min = r < g ? r : g;
        if (b < min) {
            min = b;
        }
        double saturation = max != 0 ? (max - min) / max : 0;
        double hue = 0;
        if (saturation != 0) {
            double rc = (max - r) / (max - min);
            double gc = (max - g) / (max - min);
            double bc = (max - b) / (max - min);
            if (r == max) {
                hue = bc - gc;
            } else if (g == max) {
                hue = 2.0 + rc - bc;
            } else {
                hue = 4.0 + gc - rc;
            }
            hue = hue / 6.0;
            if (hue < 0) {
                hue = hue + 1.0;
            }
        }
        return new double[] { hue * 360, saturation, max };
    }

    /** This color with its brightness multiplied (a black made brighter starts from 0.05). */
    private Color withBrightness(double factor) {
        double[] hsb = toHsb();
        double b = hsb[2];
        if (b == 0 && factor > 1.0) {
            b = 0.05;
        }
        b = Math.max(Math.min(b * factor, 1.0), 0.0);
        double s = Math.max(Math.min(hsb[1], 1.0), 0.0);
        double h = (hsb[0] % 360 + 360) % 360;
        double a = Math.max(Math.min(opacity * 1.0, 1.0), 0.0);
        return hsb(h, s, b, a);
    }

    /** A brighter version of this color (its brightness divided by 0.7), as in JavaFX. */
    public Color brighter() {
        return withBrightness(1.0 / BRIGHTER_DARKER);
    }

    /** A darker version of this color (its brightness multiplied by 0.7), as in JavaFX. */
    public Color darker() {
        return withBrightness(BRIGHTER_DARKER);
    }

    /** The gray of the same lightness: 0.21 red + 0.71 green + 0.07 blue, as in JavaFX. */
    public Color grayscale() {
        double gray = 0.21 * red + 0.71 * green + 0.07 * blue;
        return new Color(gray, gray, gray, opacity);
    }

    /** The opposite color: 1 - red, 1 - green, 1 - blue, with the same opacity. */
    public Color invert() {
        return new Color(1 - red, 1 - green, 1 - blue, opacity);
    }

    public final double getRed() {
        return red;
    }

    public final double getGreen() {
        return green;
    }

    public final double getBlue() {
        return blue;
    }

    public final double getOpacity() {
        return opacity;
    }

    /** Colors are equal when their four (float) values are. */
    @Override
    public boolean equals(Object other) {
        if (other == this) {
            return true;
        }
        if (!(other instanceof Color)) {
            return false;
        }
        Color o = (Color) other;
        return red == o.red && green == o.green && blue == o.blue && opacity == o.opacity;
    }

    /** The color as the int 0xrrggbbaa, as in JavaFX. */
    @Override
    public int hashCode() {
        return (byteOf(red) << 24) | (byteOf(green) << 16) | (byteOf(blue) << 8) | byteOf(opacity);
    }

    private static int byteOf(float value) {
        return (int) Math.round(value * 255.0);
    }

    /** The color as JavaFX writes it: 0xrrggbbaa, such as 0xff0000ff for RED. */
    @Override
    public String toString() {
        StringBuilder s = new StringBuilder(10).append("0x");
        hex(s, byteOf(red));
        hex(s, byteOf(green));
        hex(s, byteOf(blue));
        hex(s, byteOf(opacity));
        return s.toString();
    }

    /** A byte (0 to 255) as two lowercase hex digits. */
    private static void hex(StringBuilder s, int b) {
        s.append(Character.forDigit((b >> 4) & 15, 16)).append(Character.forDigit(b & 15, 16));
    }
}
