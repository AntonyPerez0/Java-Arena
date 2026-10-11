// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.image;

import javafx.scene.Node;

/** A node that shows an image, at its own size. */
public class ImageView extends Node {
    private Image image;

    /** An image view with no image. */
    public ImageView() {
    }

    public ImageView(Image image) {
        this.image = image;
    }

    /** An image view of new Image(url). */
    public ImageView(String url) {
        this(new Image(url));
    }

    public final void setImage(Image value) {
        image = value;
    }

    public final Image getImage() {
        return image;
    }
}
