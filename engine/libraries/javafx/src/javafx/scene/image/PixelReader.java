// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.image;

import javafx.scene.paint.Color;

/** Reads the pixels of an image: image.getPixelReader(). x goes across from 0, y down from 0. */
public interface PixelReader {
    /** The pixel's color as an int 0xAARRGGBB: alpha (opacity), red, green, blue, each 0 to 255. */
    int getArgb(int x, int y);

    /** The pixel's color. */
    Color getColor(int x, int y);
}
