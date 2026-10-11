import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.zip.CRC32;
import java.util.zip.Deflater;
import java.util.function.IntFunction;

// PNG files of every kind for the probe, made by our own code: gray, gray with alpha, RGB, RGBA and
// palette images at every bit depth, with tRNS transparency, every row filter, Adam7 interlacing,
// a gamma chunk and a text chunk, and broken ones (a bad signature, a bad CRC, data cut short,
// broken compressed data, no IHDR, no PLTE, no IEND, a bad filter, sizes of 0, wrong depths).
final class Pngs {
    private Pngs() {
    }

    static byte[] chunk(String type, byte[] data) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(data.length >>> 24);
        out.write(data.length >>> 16);
        out.write(data.length >>> 8);
        out.write(data.length);
        byte[] td = concat(type.getBytes(), data);
        out.writeBytes(td);
        CRC32 crc = new CRC32();
        crc.update(td);
        long c = crc.getValue();
        out.write((int) (c >>> 24));
        out.write((int) (c >>> 16));
        out.write((int) (c >>> 8));
        out.write((int) c);
        return out.toByteArray();
    }

    static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] p : parts) {
            out.writeBytes(p);
        }
        return out.toByteArray();
    }

    static byte[] deflate(byte[] raw) {
        Deflater d = new Deflater();
        d.setInput(raw);
        d.finish();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        while (!d.finished()) {
            out.write(buf, 0, d.deflate(buf));
        }
        d.end();
        return out.toByteArray();
    }

    static final byte[] SIGNATURE = { (byte) 137, 80, 78, 71, 13, 10, 26, 10 };

    static byte[] ihdr(int w, int h, int depth, int colorType, int interlace) {
        byte[] b = new byte[13];
        put32(b, 0, w);
        put32(b, 4, h);
        b[8] = (byte) depth;
        b[9] = (byte) colorType;
        b[12] = (byte) interlace;
        return b;
    }

    static void put32(byte[] b, int at, int v) {
        b[at] = (byte) (v >>> 24);
        b[at + 1] = (byte) (v >>> 16);
        b[at + 2] = (byte) (v >>> 8);
        b[at + 3] = (byte) v;
    }

    static int channels(int colorType) {
        switch (colorType) {
            case 0:
            case 3:
                return 1;
            case 2:
                return 3;
            case 4:
                return 2;
            default:
                return 4;
        }
    }

    /** rows: raw scanlines without the filter byte; filter(y) the filter of each row. */
    static byte[] png(int w, int h, int depth, int colorType, byte[][] rows, byte[] plte, byte[] trns, IntFunction<Integer> filter, byte[][] extra) {
        int bpp = Math.max(1, (channels(colorType) * depth + 7) / 8);
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        byte[] prev = new byte[rows[0].length];
        for (int y = 0; y < rows.length; y++) {
            byte[] row = rows[y];
            int f = filter == null ? 0 : filter.apply(y);
            raw.write(f);
            for (int i = 0; i < row.length; i++) {
                int a = i >= bpp ? row[i - bpp] & 255 : 0;
                int b = prev[i] & 255;
                int c = i >= bpp ? prev[i - bpp] & 255 : 0;
                int pred = 0;
                if (f == 1) {
                    pred = a;
                } else if (f == 2) {
                    pred = b;
                } else if (f == 3) {
                    pred = (a + b) >> 1;
                } else if (f == 4) {
                    int p = a + b - c;
                    int pa = Math.abs(p - a);
                    int pb = Math.abs(p - b);
                    int pc = Math.abs(p - c);
                    pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
                }
                raw.write(((row[i] & 255) - pred) & 255);
            }
            prev = row;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(SIGNATURE);
        out.writeBytes(chunk("IHDR", ihdr(w, h, depth, colorType, 0)));
        if (extra != null) {
            for (int i = 0; i < extra.length; i += 2) {
                out.writeBytes(chunk(new String(extra[i]), extra[i + 1]));
            }
        }
        if (plte != null) {
            out.writeBytes(chunk("PLTE", plte));
        }
        if (trns != null) {
            out.writeBytes(chunk("tRNS", trns));
        }
        byte[] z = deflate(raw.toByteArray());
        int mid = z.length / 2;
        out.writeBytes(chunk("IDAT", Arrays.copyOfRange(z, 0, mid)));
        out.writeBytes(chunk("IDAT", Arrays.copyOfRange(z, mid, z.length)));
        out.writeBytes(chunk("IEND", new byte[0]));
        return out.toByteArray();
    }

    interface Pixel {
        int[] at(int x, int y);
    }

    static byte[] interlaced(int w, int h, int colorType, int depth, Pixel pixel, byte[] plte) {
        int[][] passes = { { 0, 0, 8, 8 }, { 4, 0, 8, 8 }, { 0, 4, 4, 8 }, { 2, 0, 4, 4 }, { 0, 2, 2, 4 }, { 1, 0, 2, 2 }, { 0, 1, 1, 2 } };
        int bpp = channels(colorType);
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        for (int[] pass : passes) {
            int cols = 0;
            for (int x = pass[0]; x < w; x += pass[2]) {
                cols++;
            }
            if (cols == 0) {
                continue;
            }
            for (int y = pass[1]; y < h; y += pass[3]) {
                byte[] row;
                if (depth < 8) {
                    int per = 8 / depth;
                    row = new byte[(cols + per - 1) / per];
                    int i = 0;
                    for (int x = pass[0]; x < w; x += pass[2], i++) {
                        row[i / per] |= (byte) (pixel.at(x, y)[0] << (8 - depth - (i % per) * depth));
                    }
                } else {
                    row = new byte[cols * bpp];
                    int i = 0;
                    for (int x = pass[0]; x < w; x += pass[2], i++) {
                        int[] v = pixel.at(x, y);
                        for (int k = 0; k < bpp; k++) {
                            row[i * bpp + k] = (byte) v[k];
                        }
                    }
                }
                int b = Math.max(1, depth < 8 ? 1 : bpp);
                raw.write(1);
                for (int i = 0; i < row.length; i++) {
                    raw.write(((row[i] & 255) - (i >= b ? row[i - b] & 255 : 0)) & 255);
                }
            }
        }
        return concat(SIGNATURE, chunk("IHDR", ihdr(w, h, depth, colorType, 1)), plte == null ? new byte[0] : chunk("PLTE", plte), chunk("IDAT", deflate(raw.toByteArray())), chunk("IEND", new byte[0]));
    }

    static byte[] bytes(int... v) {
        byte[] b = new byte[v.length];
        for (int i = 0; i < v.length; i++) {
            b[i] = (byte) v[i];
        }
        return b;
    }

    static void write(File dir, String name, byte[] data) throws IOException {
        Files.write(new File(dir, name).toPath(), data);
    }

    static void u16(byte[] b, int at, int v) {
        b[at] = (byte) (v >>> 8);
        b[at + 1] = (byte) v;
    }

    static void makeAll(File dir) throws IOException {
        dir.mkdirs();
        int W = 7;
        int H = 5;
        byte[][] gray = new byte[H][W];
        byte[][] ga = new byte[H][W * 2];
        byte[][] rgb = new byte[H][W * 3];
        byte[][] rgba = new byte[H][W * 4];
        byte[][] pal = new byte[H][W];
        int[] alphas = { 0, 255, 128, 1, 254 };
        int[] alphas7 = { 0, 255, 128, 1, 254, 77, 255 };
        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                gray[y][x] = (byte) (x * 37 + y * 51);
                ga[y][2 * x] = (byte) (x * 37 + y * 51);
                ga[y][2 * x + 1] = (byte) alphas[(x + y) % 5];
                rgb[y][3 * x] = (byte) (x * 40);
                rgb[y][3 * x + 1] = (byte) (y * 60);
                rgb[y][3 * x + 2] = (byte) (x * y * 13);
                rgba[y][4 * x] = (byte) (x * 40);
                rgba[y][4 * x + 1] = (byte) (y * 60);
                rgba[y][4 * x + 2] = (byte) 200;
                rgba[y][4 * x + 3] = (byte) alphas7[(x + y) % 7];
                pal[y][x] = (byte) ((x + y) % 6);
            }
        }
        write(dir, "gray8.png", png(W, H, 8, 0, gray, null, null, y -> y % 5, null));
        write(dir, "grayalpha8.png", png(W, H, 8, 4, ga, null, null, y -> (y + 1) % 5, null));
        write(dir, "rgb8.png", png(W, H, 8, 2, rgb, null, null, y -> (y + 2) % 5, null));
        write(dir, "rgba8.png", png(W, H, 8, 6, rgba, null, null, y -> (y + 3) % 5, null));
        byte[] plte = new byte[18];
        for (int i = 0; i < 6; i++) {
            plte[3 * i] = (byte) (i * 50);
            plte[3 * i + 1] = (byte) (255 - i * 40);
            plte[3 * i + 2] = (byte) (i * 99);
        }
        write(dir, "palette8.png", png(W, H, 8, 3, pal, plte, null, null, null));
        write(dir, "palette8trns.png", png(W, H, 8, 3, pal, plte, bytes(0, 128, 255), null, null));
        for (int d : new int[] { 1, 2, 4 }) {
            int per = 8 / d;
            int n = 1 << d;
            byte[][] prow = new byte[H][(W + per - 1) / per];
            byte[][] grow = new byte[H][(W + per - 1) / per];
            for (int y = 0; y < H; y++) {
                for (int x = 0; x < W; x++) {
                    prow[y][x / per] |= (byte) (((x + y) % Math.min(n, 6)) << (8 - d - (x % per) * d));
                    grow[y][x / per] |= (byte) (((x * 3 + y) % n) << (8 - d - (x % per) * d));
                }
            }
            write(dir, "palette" + d + ".png", png(W, H, d, 3, prow, Arrays.copyOf(plte, 3 * Math.min(n, 6)), null, null, null));
            write(dir, "gray" + d + ".png", png(W, H, d, 0, grow, null, null, null, null));
        }
        write(dir, "gray8trns.png", png(W, H, 8, 0, gray, null, bytes(0, 88), null, null));
        write(dir, "rgb8trns.png", png(W, H, 8, 2, rgb, null, bytes(0, 40, 0, 60, 0, 13), null, null));
        byte[][] rgb16 = new byte[H][W * 6];
        for (int y = 0; y < H; y++) {
            for (int x = 0; x < W; x++) {
                u16(rgb16[y], 6 * x, x * 9000 + 77);
                u16(rgb16[y], 6 * x + 2, y * 12000 + 129);
                u16(rgb16[y], 6 * x + 4, 40000);
            }
        }
        write(dir, "rgb16.png", png(W, H, 16, 2, rgb16, null, null, null, null));
        byte[] good = png(W, H, 8, 2, rgb, null, null, null, null);
        write(dir, "truncated.png", Arrays.copyOf(good, good.length - 30));
        byte[] badcrc = good.clone();
        badcrc[30] ^= 1;
        write(dir, "badcrc.png", badcrc);
        write(dir, "withgama.png", png(W, H, 8, 2, rgb, null, null, null, new byte[][] { "gAMA".getBytes(), bytes(0, 0, 0xb1, 0x8f), "tEXt".getBytes(), "Comment\0hi".getBytes() }));
        write(dir, "empty.png", new byte[0]);
        write(dir, "notpng.png", "hello, this is not a png file\n".getBytes());
        byte[][] all = new byte[256][256 * 4];
        for (int y = 0; y < 256; y++) {
            for (int x = 0; x < 256; x++) {
                all[y][4 * x] = (byte) x;
                all[y][4 * x + 1] = (byte) (255 - x);
                all[y][4 * x + 2] = (byte) (x ^ 0x5a);
                all[y][4 * x + 3] = (byte) y;
            }
        }
        write(dir, "allalpha.png", png(256, 256, 8, 6, all, null, null, y -> y % 5, null));
        write(dir, "interlaced.png", interlaced(W, H, 0, 8, (x, y) -> new int[] { (x * 37 + y * 51) & 255 }, null));
        write(dir, "interlaced-rgb.png", interlaced(11, 9, 2, 8, (x, y) -> new int[] { x * 20, y * 25, (x * y * 7) & 255 }, null));
        write(dir, "interlaced-rgba.png", interlaced(3, 2, 6, 8, (x, y) -> new int[] { x * 80, y * 100, 7, x == 1 ? 0 : 255 }, null));
        write(dir, "interlaced-gray2.png", interlaced(10, 10, 0, 2, (x, y) -> new int[] { (x + y) % 4 }, null));
        int w = 4;
        int h = 3;
        byte[][] ga16 = new byte[h][w * 4];
        byte[][] rgba16 = new byte[h][w * 8];
        byte[][] g16 = new byte[h][w * 2];
        byte[][] g2 = new byte[h][1];
        int[] a16 = { 0, 65535, 32896, 300 };
        int[] a16b = { 0, 65535, 32896, 255 };
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                u16(ga16[y], 4 * x, x * 20000 + y * 100);
                u16(ga16[y], 4 * x + 2, a16[x]);
                u16(rgba16[y], 8 * x, x * 20000 + 255);
                u16(rgba16[y], 8 * x + 2, y * 30000);
                u16(rgba16[y], 8 * x + 4, 12345);
                u16(rgba16[y], 8 * x + 6, a16b[x]);
                u16(g16[y], 2 * x, x * 20000 + y);
                g2[y][0] |= (byte) (((x + y) % 4) << (6 - 2 * x));
            }
        }
        write(dir, "grayalpha16.png", png(w, h, 16, 4, ga16, null, null, null, null));
        write(dir, "rgba16.png", png(w, h, 16, 6, rgba16, null, null, null, null));
        write(dir, "gray16trns.png", png(w, h, 16, 0, g16, null, bytes(0x4e, 0x21), null, null));
        write(dir, "gray16trns-hibyte.png", png(w, h, 16, 0, g16, null, bytes(0x4e, 0x20), null, null));
        write(dir, "gray2trns.png", png(w, h, 2, 0, g2, null, bytes(0, 2), null, null));
        byte[][] badIndex = { bytes(0, 1, 2, 9), bytes(0, 1, 2, 9), bytes(0, 1, 2, 9) };
        write(dir, "palette-badindex.png", png(w, h, 8, 3, badIndex, bytes(255, 0, 0, 0, 255, 0, 0, 0, 255), null, null, null));
        write(dir, "one.png", png(1, 1, 8, 6, new byte[][] { bytes(1, 2, 3, 4) }, null, null, null, null));
        write(dir, "badfilter.png", png(2, 2, 8, 0, new byte[][] { bytes(1, 2), bytes(3, 4) }, null, null, y -> y == 1 ? 5 : 0, null));
        byte[] z = png(1, 1, 8, 0, new byte[][] { bytes(9) }, null, null, null, null);
        Pngs.put32(z, 16, 0);
        write(dir, "zerowidth.png", z);
        write(dir, "rgb4.png", png(2, 1, 4, 2, new byte[][] { bytes(1, 2, 3) }, null, null, null, null));
        byte[] small = png(2, 2, 8, 0, new byte[][] { bytes(1, 2), bytes(3, 4) }, null, null, null, null);
        write(dir, "signature-only.png", Arrays.copyOf(small, 8));
        write(dir, "header-only.png", Arrays.copyOf(small, 33));
        write(dir, "trailing.png", concat(small, "junk".getBytes()));
        write(dir, "shortdata.png", png(4, 4, 8, 0, new byte[][] { bytes(1, 2) }, null, null, null, null));
        write(dir, "noiend.png", Arrays.copyOf(small, small.length - 12));
        write(dir, "badzlib.png", concat(Arrays.copyOf(small, 33), bytes(0, 0, 0, 6, 73, 68, 65, 84, 1, 2, 3, 4, 5, 6, 0, 0, 0, 0), Arrays.copyOfRange(small, small.length - 12, small.length)));
        byte[] zh = small.clone();
        Pngs.put32(zh, 20, 0);
        write(dir, "zeroheight.png", zh);
        write(dir, "noihdr.png", concat(Arrays.copyOf(small, 8), Arrays.copyOfRange(small, 33, small.length)));
        write(dir, "noplte.png", png(2, 1, 8, 3, new byte[][] { bytes(0, 1) }, null, null, null, null));
        byte[] big = small.clone();
        Pngs.put32(big, 16, 3000);
        Pngs.put32(big, 20, 2000);
        write(dir, "bigheader.png", big);
        chunkOrder(dir, plte, rgb, gray, pal);
    }

    /** A PNG file of the given chunks after the signature and IHDR, each a type and its data. */
    static byte[] chunks(byte[] ihdr, Object... typeAndData) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(SIGNATURE);
        out.writeBytes(chunk("IHDR", ihdr));
        for (int i = 0; i < typeAndData.length; i += 2) {
            out.writeBytes(chunk((String) typeAndData[i], (byte[]) typeAndData[i + 1]));
        }
        out.writeBytes(chunk("IEND", new byte[0]));
        return out.toByteArray();
    }

    /** The compressed rows of an image (filter none). */
    static byte[] data(byte[][] rows) {
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        for (byte[] row : rows) {
            raw.write(0);
            raw.writeBytes(row);
        }
        return deflate(raw.toByteArray());
    }

    /**
     * Chunks in an unusual order or of an unusual length, where JavaFX reads the chunks before the
     * first IDAT only, keeps the first PLTE, ignores a tRNS before PLTE, reads image data from
     * consecutive IDATs only, and reads a gray or RGB tRNS only when it has 2 or 6 bytes (any other
     * length leaves its bytes to be read as the next chunk's).
     */
    static void chunkOrder(File dir, byte[] plte, byte[][] rgb, byte[][] gray, byte[][] pal) throws IOException {
        int W = 7;
        int H = 5;
        byte[] g = ihdr(W, H, 8, 0, 0);
        byte[] c = ihdr(W, H, 8, 2, 0);
        byte[] p = ihdr(W, H, 8, 3, 0);
        byte[] ga = ihdr(W, H, 8, 4, 0);
        byte[] gz = data(gray);
        byte[] cz = data(rgb);
        byte[] pz = data(pal);
        byte[] none = new byte[0];
        byte[] palAlpha = bytes(0, 128, 255);
        byte[] gzA = Arrays.copyOfRange(gz, 0, gz.length / 2);
        byte[] gzB = Arrays.copyOfRange(gz, gz.length / 2, gz.length);
        byte[] otherPlte = plte.clone();
        otherPlte[0] = (byte) 222;
        otherPlte[4] = (byte) 33;
        write(dir, "order-idat-empty-first.png", chunks(g, "IDAT", none, "IDAT", gz));
        write(dir, "order-idat-empty-after.png", chunks(g, "IDAT", gz, "IDAT", none));
        write(dir, "order-idat-text-idat.png", chunks(g, "IDAT", gzA, "tEXt", "Comment\0hi".getBytes(), "IDAT", gzB));
        write(dir, "order-idat-only-empty.png", chunks(g, "IDAT", none));
        write(dir, "order-no-idat.png", chunks(g));
        write(dir, "order-trns-before-plte.png", chunks(p, "tRNS", palAlpha, "PLTE", plte, "IDAT", pz));
        write(dir, "order-plte-after-idat.png", chunks(p, "IDAT", pz, "PLTE", plte));
        write(dir, "order-palette-trns-after-idat.png", chunks(p, "PLTE", plte, "IDAT", pz, "tRNS", palAlpha));
        write(dir, "order-rgb-trns-after-idat.png", chunks(c, "IDAT", cz, "tRNS", bytes(0, 40, 0, 60, 0, 13)));
        write(dir, "order-two-plte.png", chunks(p, "PLTE", plte, "PLTE", otherPlte, "IDAT", pz));
        write(dir, "order-plte-in-gray.png", chunks(g, "PLTE", plte, "IDAT", gz));
        write(dir, "order-plte-in-rgb.png", chunks(c, "PLTE", plte, "IDAT", cz));
        write(dir, "order-trns-in-grayalpha.png", chunks(ga, "tRNS", bytes(0, 0), "IDAT", data(new byte[][] { new byte[14], new byte[14], new byte[14], new byte[14], new byte[14] })));
        write(dir, "order-two-gray-trns.png", chunks(g, "tRNS", bytes(0, 88), "tRNS", bytes(0, 0x25), "IDAT", gz));
        write(dir, "order-gray-trns-then-empty.png", chunks(g, "tRNS", bytes(0, 88), "tRNS", none, "IDAT", gz));
        write(dir, "order-palette-trns-empty.png", chunks(p, "PLTE", plte, "tRNS", none, "IDAT", pz));
        write(dir, "order-palette-trns-long.png", chunks(p, "PLTE", plte, "tRNS", bytes(0, 128, 255, 1, 2, 3, 4, 5, 6), "IDAT", pz));
        for (int n : new int[] { 0, 1, 3, 4, 6 }) {
            byte[] t = new byte[n];
            for (int i = 0; i < n; i++) {
                t[i] = (byte) (i == 1 ? 88 : 0);
            }
            write(dir, "order-gray-trns-" + n + ".png", chunks(g, "tRNS", t, "IDAT", gz));
        }
        for (int n : new int[] { 0, 2, 4, 7, 8 }) {
            byte[] t = new byte[n];
            byte[] v = bytes(0, 40, 0, 60, 0, 13, 0, 0);
            System.arraycopy(v, 0, t, 0, n);
            write(dir, "order-rgb-trns-" + n + ".png", chunks(c, "tRNS", t, "IDAT", cz));
        }
    }
}
