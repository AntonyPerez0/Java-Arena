// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.image;

import arena.fx.Images;
import java.io.InputStream;
import javafx.scene.paint.Color;

/**
 * An image read from a PNG file: new Image("file:name.png") reads name.png in the program's folder.
 * A file that is missing or isn't an image gives an error image (isError() is true, getException()
 * says why, its size is 0 x 0 and getPixelReader() is null), as in JavaFX; an address without a
 * scheme (such as "name.png") throws IllegalArgumentException, as it does in JavaFX when there is
 * no such class path resource. Java Arena reads PNG images only.
 */
public class Image {
    static {
        Images.register(new Images.Access() {
            @Override
            public Images.Loaded of(Image image) {
                return new Images.Loaded(image.width, image.height, image.argb, image.format, image.exception);
            }

            @Override
            public Image sourceOf(PixelReader reader) {
                return reader instanceof Reader ? ((Reader) reader).image : null;
            }
        });
    }

    final int width;
    final int height;
    /** ARGB, row by row, as a PixelReader reads them; null for an error image. */
    final int[] argb;
    private final int format;
    private final Exception exception;
    private PixelReader reader;

    /** The image at this address, such as "file:landscape.png" (a file in the program's folder). */
    public Image(String url) {
        this(Images.load(url));
    }

    /** The image the stream holds (read to its end). */
    public Image(InputStream is) {
        this(Images.load(is));
    }

    Image(Images.Loaded loaded) {
        width = loaded.width;
        height = loaded.height;
        argb = loaded.argb;
        format = loaded.format;
        exception = loaded.exception;
    }

    /** The width in pixels (0 for an error image). */
    public final double getWidth() {
        return width;
    }

    /** The height in pixels (0 for an error image). */
    public final double getHeight() {
        return height;
    }

    /** Whether the image couldn't be read. */
    public final boolean isError() {
        return exception != null;
    }

    /** Why the image couldn't be read, or null. */
    public final Exception getException() {
        return exception;
    }

    /** Reads the image's pixels (always the same reader), or null for an error image. */
    public final PixelReader getPixelReader() {
        if (argb == null) {
            return null;
        }
        synchronized (this) {
            if (reader == null) {
                reader = new Reader(this);
            }
            return reader;
        }
    }

    static void check(Image image, int x, int y) {
        if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
            throw new IndexOutOfBoundsException(x + ", " + y);
        }
    }

    private static final class Reader implements PixelReader {
        final Image image;

        Reader(Image image) {
            this.image = image;
        }

        @Override
        public int getArgb(int x, int y) {
            check(image, x, y);
            return image.argb[y * image.width + x];
        }

        @Override
        public Color getColor(int x, int y) {
            int v = getArgb(x, y);
            return Color.rgb((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, (v >>> 24) / 255.0);
        }
    }
}
