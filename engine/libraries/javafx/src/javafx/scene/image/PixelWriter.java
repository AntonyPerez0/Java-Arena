// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.image;

import javafx.scene.paint.Color;

/** Changes the pixels of a WritableImage: image.getPixelWriter(). x goes across from 0, y down from 0. */
public interface PixelWriter {
    /** Sets the pixel to the color 0xAARRGGBB: alpha (opacity), red, green, blue, each 0 to 255. */
    void setArgb(int x, int y, int argb);

    /** Sets the pixel to the color. */
    void setColor(int x, int y, Color c);
}
