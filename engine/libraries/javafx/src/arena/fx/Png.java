// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import com.sun.javafx.iio.ImageStorageException;
import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;
import java.util.zip.ZipException;

/**
 * Reads PNG images, Java Arena's own decoder (javax.imageio isn't in the browser engine's class
 * library). It reads every kind of PNG: gray, gray with alpha, RGB, RGBA and palette images, of every
 * bit depth (16-bit samples keep their high byte, as JavaFX keeps them), interlaced or not, with
 * transparency (tRNS). The pixels are what JavaFX's PixelReader gives for them: JavaFX keeps an image
 * that has transparency with premultiplied alpha, so a pixel that isn't opaque reads back with its
 * colors rounded through that (and a fully transparent pixel as 0x00000000). As in JavaFX, the CRCs
 * of the chunks aren't checked, and an unknown filter type counts as none.
 */
public final class Png {
    /** How JavaFX keeps an image, which decides what copying too much of it throws (see Pixels). */
    public static final int GRAY = 0;
    public static final int RGB = 1;
    public static final int PREMULTIPLIED = 2;

    private static final byte[] SIGNATURE = { (byte) 137, 80, 78, 71, 13, 10, 26, 10 };
    private static final int[][] ADAM7 = { { 0, 0, 8, 8 }, { 4, 0, 8, 8 }, { 0, 4, 4, 8 }, { 2, 0, 4, 4 }, { 0, 2, 2, 4 }, { 1, 0, 2, 2 }, { 0, 1, 1, 2 } };

    /** A decoded image: its size, its pixels (ARGB, row by row) and how JavaFX keeps it. */
    public static final class Decoded {
        public final int width;
        public final int height;
        public final int[] argb;
        public final int format;

        Decoded(int width, int height, int[] argb, int format) {
            this.width = width;
            this.height = height;
            this.argb = argb;
            this.format = format;
        }
    }

    private Png() {
    }

    /** Decodes a PNG file's bytes, or throws what JavaFX's image loading gives for them. */
    public static Decoded decode(byte[] data) throws IOException {
        if (!startsWith(data, SIGNATURE)) {
            String kind = otherFormat(data);
            if (kind != null) {
                throw new IOException("Java Arena's JavaFX reads only PNG images, and this is a " + kind + " image");
            }
            throw new ImageStorageException("No loader for image data");
        }
        return new Png.Reader(data).read();
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    /** The kind of an image file in another format that real JavaFX reads (JPEG, GIF, BMP), or null. */
    private static String otherFormat(byte[] d) {
        if (d.length >= 3 && (d[0] & 0xff) == 0xff && (d[1] & 0xff) == 0xd8 && (d[2] & 0xff) == 0xff) {
            return "JPEG";
        }
        if (d.length >= 6 && d[0] == 'G' && d[1] == 'I' && d[2] == 'F' && d[3] == '8' && (d[4] == '7' || d[4] == '9') && d[5] == 'a') {
            return "GIF";
        }
        if (d.length >= 2 && d[0] == 'B' && d[1] == 'M') {
            return "BMP";
        }
        return null;
    }

    private static final class Reader {
        private final byte[] data;
        private int at = SIGNATURE.length;
        private int width;
        private int height;
        private int depth;
        private int colorType;
        private boolean interlaced;
        /** The palette's colors; null until a PLTE chunk. */
        private int[] palette;
        private int[] paletteAlpha = new int[0];
        /** Whether a palette's tRNS was read (even an empty one: JavaFX then keeps the image premultiplied). */
        private boolean paletteTransparency;
        private int[] transparent;
        private final ByteArrayOutputStream compressed = new ByteArrayOutputStream();

        Reader(byte[] data) {
            this.data = data;
        }

        private int u8() throws EOFException {
            if (at >= data.length) {
                throw new EOFException();
            }
            return data[at++] & 0xff;
        }

        private int u32() throws EOFException {
            return (u8() << 24) | (u8() << 16) | (u8() << 8) | u8();
        }

        private byte[] bytes(int n) throws EOFException {
            if (n < 0 || n > data.length - at) {
                throw new EOFException();
            }
            byte[] b = new byte[n];
            System.arraycopy(data, at, b, 0, n);
            at += n;
            return b;
        }

        private String type() throws EOFException {
            return new String(bytes(4), java.nio.charset.StandardCharsets.ISO_8859_1);
        }

        private void skip(int n) throws EOFException {
            // As DataInputStream.skipBytes, which JavaFX skips with: never backwards, at most to the end.
            if (n > 0) {
                at += Math.min(n, data.length - at);
            }
        }

        /**
         * Reads the chunks as JavaFX's PNG loader does: IHDR first; then the chunks before the first
         * IDAT only (the first PLTE, a tRNS, the others skipped); then the image data from that IDAT
         * and the IDATs right after it. So a PLTE or tRNS after the image data is ignored, as is a
         * second PLTE or a palette's tRNS before its PLTE, and an empty first IDAT (or none) fails.
         * JavaFX also logs a warning for some of these (a PLTE in a gray image, a second PLTE, a
         * tRNS before PLTE or in an image with alpha, no image data); Java Arena's doesn't.
         */
        Decoded read() throws IOException {
            int length = u32();
            String type = type();
            byte[] body = bytes(length);
            u32(); // the CRC, which JavaFX doesn't check either
            if (!type.equals("IHDR")) {
                throw new IOException("Bad PNG header!");
            }
            header(body);
            int dataLength;
            while (true) {
                length = u32();
                type = type();
                if (length < 0) {
                    throw new IOException("Invalid chunk length");
                }
                if (type.equals("IDAT")) {
                    dataLength = length;
                    break;
                }
                if (type.equals("IEND")) {
                    dataLength = 0;
                    break;
                }
                if (type.equals("PLTE")) {
                    paletteChunk(length);
                } else if (type.equals("tRNS")) {
                    transparency(length);
                } else {
                    skip(length);
                }
                u32(); // the CRC, or (after a tRNS JavaFX didn't read) the chunk's first 4 bytes
            }
            if (dataLength == 0) {
                // JavaFX's loader finds no image data and gives no image, which then fails so.
                throw new NullPointerException("Cannot read the array length because \"<parameter1>\" is null");
            }
            compressed.write(bytes(dataLength), 0, dataLength);
            while (true) {
                u32(); // the CRC
                length = u32();
                if (!type().equals("IDAT")) {
                    break;
                }
                compressed.write(bytes(length), 0, length);
            }
            return pixels();
        }

        private void paletteChunk(int length) throws EOFException {
            if (palette != null || colorType != 3) {
                // A second PLTE, or one in an image without a palette: skipped.
                skip(length);
                return;
            }
            byte[] body = bytes(length);
            palette = new int[body.length / 3];
            for (int i = 0; i < palette.length; i++) {
                palette[i] = ((body[3 * i] & 0xff) << 16) | ((body[3 * i + 1] & 0xff) << 8) | (body[3 * i + 2] & 0xff);
            }
        }

        private void header(byte[] h) throws IOException {
            if (h.length < 13) {
                throw new EOFException();
            }
            width = ((h[0] & 0xff) << 24) | ((h[1] & 0xff) << 16) | ((h[2] & 0xff) << 8) | (h[3] & 0xff);
            height = ((h[4] & 0xff) << 24) | ((h[5] & 0xff) << 16) | ((h[6] & 0xff) << 8) | (h[7] & 0xff);
            depth = h[8] & 0xff;
            colorType = h[9] & 0xff;
            if (width <= 0) {
                throw new IOException("Bad PNG image width, must be > 0!");
            }
            if (height <= 0) {
                throw new IOException("Bad PNG image height, must be > 0!");
            }
            boolean ok;
            switch (colorType) {
                case 0:
                    ok = depth == 1 || depth == 2 || depth == 4 || depth == 8 || depth == 16;
                    break;
                case 3:
                    ok = depth == 1 || depth == 2 || depth == 4 || depth == 8;
                    break;
                case 2:
                case 4:
                case 6:
                    ok = depth == 8 || depth == 16;
                    break;
                default:
                    ok = false;
            }
            if (!ok) {
                throw new IOException("Bad color type/bit depth combination!");
            }
            if ((h[10] & 0xff) != 0) {
                throw new IOException("Bad PNG compression method!");
            }
            if ((h[11] & 0xff) != 0) {
                throw new IOException("Bad PNG filter method!");
            }
            int interlace = h[12] & 0xff;
            if (interlace > 1) {
                throw new IOException("Unknown interlace method!");
            }
            interlaced = interlace == 1;
        }

        /**
         * A tRNS chunk, as JavaFX reads it: a palette's only after its PLTE; a gray image's only when
         * it has 2 bytes and an RGB image's only when it has 6, else it isn't read at all (its bytes
         * are then read as what comes after it) and the image has no transparent color; skipped in
         * an image with alpha.
         */
        private void transparency(int length) throws EOFException {
            if (colorType == 3) {
                if (palette == null) {
                    skip(length);
                    return;
                }
                byte[] t = bytes(length);
                paletteTransparency = true;
                paletteAlpha = new int[Math.min(t.length, palette.length)];
                for (int i = 0; i < paletteAlpha.length; i++) {
                    paletteAlpha[i] = t[i] & 0xff;
                }
            } else if (colorType == 0) {
                transparent = length == 2 ? new int[] { (u8() << 8) | u8() } : null;
            } else if (colorType == 2) {
                transparent = length == 6 ? new int[] { (u8() << 8) | u8(), (u8() << 8) | u8(), (u8() << 8) | u8() } : null;
            } else {
                skip(length);
            }
        }

        private int channels() {
            switch (colorType) {
                case 2:
                    return 3;
                case 4:
                    return 2;
                case 6:
                    return 4;
                default:
                    return 1;
            }
        }

        private int rowBytes(int pixels) {
            return (int) (((long) pixels * channels() * depth + 7) / 8);
        }

        private Decoded pixels() throws IOException {
            long needed = 0;
            int[][] passes = interlaced ? ADAM7 : new int[][] { { 0, 0, 1, 1 } };
            for (int[] p : passes) {
                long w = passSize(width, p[0], p[2]);
                long h = passSize(height, p[1], p[3]);
                if (w > 0 && h > 0) {
                    needed += h * (1 + rowBytes((int) w));
                }
            }
            if (needed > Integer.MAX_VALUE - 16) {
                throw new OutOfMemoryError("Java heap space");
            }
            byte[] raw = inflate((int) needed);
            int[] argb = new int[Math.multiplyExact(width, height)];
            int at = 0;
            for (int[] p : passes) {
                int w = passSize(width, p[0], p[2]);
                int h = passSize(height, p[1], p[3]);
                if (w == 0 || h == 0) {
                    continue;
                }
                int stride = rowBytes(w);
                int bpp = Math.max(1, channels() * depth / 8);
                byte[] previous = new byte[stride];
                byte[] row = new byte[stride];
                for (int y = 0; y < h; y++) {
                    int filter = raw[at++] & 0xff;
                    System.arraycopy(raw, at, row, 0, stride);
                    at += stride;
                    unfilter(filter, row, previous, bpp);
                    for (int x = 0; x < w; x++) {
                        argb[(p[1] + y * p[3]) * width + p[0] + x * p[2]] = pixel(row, x);
                    }
                    byte[] swap = previous;
                    previous = row;
                    row = swap;
                }
            }
            int format = format();
            if (format == PREMULTIPLIED) {
                for (int i = 0; i < argb.length; i++) {
                    argb[i] = Pixels.stored(argb[i]);
                }
            }
            return new Decoded(width, height, argb, format);
        }

        private int format() {
            if (colorType == 4 || colorType == 6 || transparent != null || (colorType == 3 && paletteTransparency)) {
                return PREMULTIPLIED;
            }
            return colorType == 0 ? GRAY : RGB;
        }

        private int passSize(int size, int start, int step) {
            return size <= start ? 0 : (size - start + step - 1) / step;
        }

        private byte[] inflate(int needed) throws IOException {
            byte[] out = new byte[needed];
            Inflater inflater = new Inflater();
            try {
                inflater.setInput(compressed.toByteArray());
                int done = 0;
                while (done < needed) {
                    int n;
                    try {
                        n = inflater.inflate(out, done, needed - done);
                    } catch (InternalError e) {
                        // The browser's engine reports bad zlib data as an InternalError
                        // ("deflate decompression error: incorrect header check") where the JDK
                        // throws a DataFormatException with the text after the colon.
                        throw new ZipException(zlibMessage(e.getMessage()));
                    }
                    if (n == 0) {
                        if (inflater.finished() || inflater.needsDictionary()) {
                            // The stream ended (or needs a dictionary) before the image's rows did.
                            throw new EOFException();
                        }
                        if (inflater.needsInput()) {
                            // The data ran out before the stream's end, as InflaterInputStream says it.
                            throw new EOFException("Unexpected end of ZLIB input stream");
                        }
                    }
                    done += n;
                }
            } catch (DataFormatException e) {
                throw new ZipException(e.getMessage());
            } finally {
                inflater.end();
            }
            return out;
        }

        /** The zlib text of the browser engine's InternalError, as the JDK's DataFormatException gives it. */
        private static String zlibMessage(String message) {
            String prefix = "deflate decompression error: ";
            if (message == null) {
                return null;
            }
            int at = message.indexOf(prefix);
            return at >= 0 ? message.substring(at + prefix.length()) : message;
        }

        private static void unfilter(int filter, byte[] row, byte[] previous, int bpp) {
            int n = row.length;
            switch (filter) {
                case 1:
                    for (int i = bpp; i < n; i++) {
                        row[i] = (byte) (row[i] + row[i - bpp]);
                    }
                    break;
                case 2:
                    for (int i = 0; i < n; i++) {
                        row[i] = (byte) (row[i] + previous[i]);
                    }
                    break;
                case 3:
                    for (int i = 0; i < n; i++) {
                        int left = i >= bpp ? row[i - bpp] & 0xff : 0;
                        row[i] = (byte) (row[i] + ((left + (previous[i] & 0xff)) >> 1));
                    }
                    break;
                case 4:
                    for (int i = 0; i < n; i++) {
                        int a = i >= bpp ? row[i - bpp] & 0xff : 0;
                        int b = previous[i] & 0xff;
                        int c = i >= bpp ? previous[i - bpp] & 0xff : 0;
                        int p = a + b - c;
                        int pa = Math.abs(p - a);
                        int pb = Math.abs(p - b);
                        int pc = Math.abs(p - c);
                        int predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
                        row[i] = (byte) (row[i] + predictor);
                    }
                    break;
                default:
                    // 0 (none), and as in JavaFX, a filter type it doesn't know.
                    break;
            }
        }

        /** Sample i of a row of samples of `depth` bits (a 16-bit sample whole). */
        private int sample(byte[] row, int i) {
            if (depth == 8) {
                return row[i] & 0xff;
            }
            if (depth == 16) {
                return ((row[2 * i] & 0xff) << 8) | (row[2 * i + 1] & 0xff);
            }
            int bit = i * depth;
            return ((row[bit >> 3] & 0xff) >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
        }

        /** An 8-bit value of a sample: a 16-bit sample's high byte, a smaller one scaled up. */
        private int eight(int s) {
            switch (depth) {
                case 16:
                    return s >> 8;
                case 8:
                    return s;
                default:
                    return s * 255 / ((1 << depth) - 1);
            }
        }

        private int pixel(byte[] row, int x) {
            switch (colorType) {
                case 0: {
                    int s = sample(row, x);
                    if (transparent != null && s == transparent[0]) {
                        return 0;
                    }
                    int g = eight(s);
                    return 0xff000000 | (g << 16) | (g << 8) | g;
                }
                case 2: {
                    int r = sample(row, 3 * x);
                    int g = sample(row, 3 * x + 1);
                    int b = sample(row, 3 * x + 2);
                    if (transparent != null && r == transparent[0] && g == transparent[1] && b == transparent[2]) {
                        return 0;
                    }
                    return 0xff000000 | (eight(r) << 16) | (eight(g) << 8) | eight(b);
                }
                case 3: {
                    int i = sample(row, x);
                    if (palette == null) {
                        // What JavaFX's decoder gives a palette image without a palette.
                        throw new NullPointerException("Cannot load from object array because \"this.palette\" is null");
                    }
                    int rgb = i < palette.length ? palette[i] : 0;
                    int a = i < paletteAlpha.length ? paletteAlpha[i] : 255;
                    return (a << 24) | rgb;
                }
                case 4: {
                    int g = eight(sample(row, 2 * x));
                    int a = eight(sample(row, 2 * x + 1));
                    return (a << 24) | (g << 16) | (g << 8) | g;
                }
                default: {
                    int r = eight(sample(row, 4 * x));
                    int g = eight(sample(row, 4 * x + 1));
                    int b = eight(sample(row, 4 * x + 2));
                    int a = eight(sample(row, 4 * x + 3));
                    return (a << 24) | (r << 16) | (g << 8) | b;
                }
            }
        }
    }
}
