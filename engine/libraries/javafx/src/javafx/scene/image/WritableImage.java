// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.image;

import arena.fx.Images;
import arena.fx.Pixels;
import javafx.scene.paint.Color;

/**
 * An image whose pixels a program sets, through getPixelWriter(). As in JavaFX it keeps its pixels
 * with premultiplied alpha, so a pixel that isn't opaque reads back with its colors rounded through
 * that, and a fully transparent one as 0x00000000.
 */
public class WritableImage extends Image {
    private PixelWriter writer;

    /** A transparent image of this size (both above 0). */
    public WritableImage(int width, int height) {
        super(Images.blank(width, height));
    }

    /** A copy of the top left width x height pixels that the reader reads. */
    public WritableImage(PixelReader reader, int width, int height) {
        super(Images.copy(reader, width, height));
    }

    /** Changes this image's pixels (always the same writer). */
    public final synchronized PixelWriter getPixelWriter() {
        if (writer == null) {
            writer = new Writer();
        }
        return writer;
    }

    private final class Writer implements PixelWriter {
        @Override
        public void setArgb(int x, int y, int argb) {
            check(WritableImage.this, x, y);
            WritableImage.this.argb[y * width + x] = Pixels.stored(argb);
        }

        @Override
        public void setColor(int x, int y, Color c) {
            if (c == null) {
                throw new NullPointerException("Color cannot be null");
            }
            int a = (int) Math.round(c.getOpacity() * 255.0);
            int r = (int) Math.round(c.getRed() * 255.0);
            int g = (int) Math.round(c.getGreen() * 255.0);
            int b = (int) Math.round(c.getBlue() * 255.0);
            setArgb(x, y, (a << 24) | (r << 16) | (g << 8) | b);
        }
    }
}
