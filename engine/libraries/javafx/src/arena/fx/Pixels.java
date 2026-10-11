// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.Base64;
import java.util.zip.CRC32;

/**
 * Pixel helpers of the images: what a pixel reads back as after JavaFX stores it with premultiplied
 * alpha, what copying too much of an image throws, and the image's CRC and pixels for the window
 * JSON.
 */
public final class Pixels {
    private Pixels() {
    }

    /**
     * The ARGB value a pixel reads back as after JavaFX keeps it premultiplied: each color times
     * the alpha, rounded, then divided again, rounded (fully transparent: 0). An opaque pixel stays
     * the same. This is what JavaFX 21 gives for every one of the 65,536 pairs of color and alpha.
     */
    public static int stored(int argb) {
        int a = argb >>> 24;
        if (a == 0) {
            return 0;
        }
        if (a == 255) {
            return argb;
        }
        return (a << 24) | (round((argb >> 16) & 0xff, a) << 16) | (round((argb >> 8) & 0xff, a) << 8) | round(argb & 0xff, a);
    }

    private static int round(int c, int a) {
        int premultiplied = (c * a + 127) / 255;
        return (premultiplied * 255 + (a >> 1)) / a;
    }

    /**
     * The pixels a WritableImage of width x height copies from an image of sourceWidth x sourceHeight
     * kept in this format, as JavaFX copies them: row y of the copy is read from the source's pixels
     * as one run starting at the start of the source's row y, so a copy wider than the source goes on
     * into the source's next row. When a row runs past the source's last pixel, JavaFX's own array
     * runs out, and this throws what it throws there for that format.
     */
    public static int[] copy(int format, int[] source, int sourceWidth, int sourceHeight, int width, int height) {
        long pixels = (long) sourceWidth * sourceHeight;
        int[] out = new int[width * height];
        for (int y = 0; y < height; y++) {
            long start = (long) y * sourceWidth;
            if (start + width > pixels) {
                if (format == Png.GRAY) {
                    throw new ArrayIndexOutOfBoundsException("Index " + pixels + " out of bounds for length " + pixels);
                }
                if (format == Png.RGB) {
                    throw new ArrayIndexOutOfBoundsException("Index " + (3 * pixels + 2) + " out of bounds for length " + 3 * pixels);
                }
                throw new ArrayIndexOutOfBoundsException("arraycopy: last source index " + 4 * (start + width) + " out of bounds for byte[" + 4 * pixels + "]");
            }
            System.arraycopy(source, (int) start, out, y * width, width);
        }
        return out;
    }

    /** The CRC-32 of the ARGB values, row by row, each as 4 bytes (A, R, G, B), as 8 hexadecimal digits. */
    public static String crc(int[] argb) {
        byte[] bytes = new byte[argb.length * 4];
        for (int i = 0; i < argb.length; i++) {
            int v = argb[i];
            bytes[4 * i] = (byte) (v >>> 24);
            bytes[4 * i + 1] = (byte) (v >>> 16);
            bytes[4 * i + 2] = (byte) (v >>> 8);
            bytes[4 * i + 3] = (byte) v;
        }
        CRC32 crc = new CRC32();
        crc.update(bytes, 0, bytes.length);
        String hex = Long.toHexString(crc.getValue());
        return "00000000".substring(hex.length()) + hex;
    }

    /** The pixels as base64 of RGBA bytes (not premultiplied), row by row, for the page's drawing. */
    public static String rgbaBase64(int[] argb) {
        byte[] bytes = new byte[argb.length * 4];
        for (int i = 0; i < argb.length; i++) {
            int v = argb[i];
            bytes[4 * i] = (byte) (v >>> 16);
            bytes[4 * i + 1] = (byte) (v >>> 8);
            bytes[4 * i + 2] = (byte) v;
            bytes[4 * i + 3] = (byte) (v >>> 24);
        }
        return Base64.getEncoder().encodeToString(bytes);
    }
}
