import javafx.scene.image.Image;
import javafx.scene.image.PixelReader;
import javafx.scene.image.PixelWriter;
import javafx.scene.image.WritableImage;
import javafx.scene.paint.Color;

/** Images read from PNG files, read pixel by pixel, and a negative built pixel by pixel. */
public class Pictures {
    final Image picture = new Image("file:picture.png");
    final WritableImage negative;

    Pictures() {
        PixelReader reader = picture.getPixelReader();
        int width = (int) picture.getWidth();
        int height = (int) picture.getHeight();
        System.out.println("picture " + width + " x " + height + ", error " + picture.isError());
        StringBuilder row = new StringBuilder();
        for (int x = 0; x < width; x++) {
            row.append(String.format(" %08x", reader.getArgb(x, height - 1)));
        }
        System.out.println("last row:" + row);
        System.out.println("color at (9, 2): " + reader.getColor(9, 2) + ", at (1, 7): " + reader.getColor(1, 7) + " opacity " + reader.getColor(1, 7).getOpacity());
        negative = new WritableImage(width, height);
        PixelWriter writer = negative.getPixelWriter();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                Color c = reader.getColor(x, y);
                writer.setColor(x, y, y % 2 == 0 ? c.invert() : c.grayscale());
            }
        }
        writer.setArgb(0, 0, 0x80ff8040);
        System.out.println("negative (0, 0) " + Integer.toHexString(negative.getPixelReader().getArgb(0, 0)) + ", (5, 3) " + negative.getPixelReader().getColor(5, 3));
        WritableImage corner = new WritableImage(picture.getPixelReader(), 4, 3);
        System.out.println("corner " + corner.getWidth() + " x " + corner.getHeight() + " " + Integer.toHexString(corner.getPixelReader().getArgb(3, 2)));
        try {
            reader.getArgb(width, 0);
        } catch (IndexOutOfBoundsException e) {
            System.out.println("outside: " + e);
        }
        try {
            new WritableImage(reader, width + 1, height);
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("too big a copy: " + e.getMessage());
        }
        Image icon = new Image("file:icon.png");
        System.out.println("icon " + icon.getWidth() + " x " + icon.getHeight() + " " + Integer.toHexString(icon.getPixelReader().getArgb(0, 0)) + " " + Integer.toHexString(icon.getPixelReader().getArgb(2, 2)) + " " + Integer.toHexString(icon.getPixelReader().getArgb(1, 2)));
        Image missing = new Image("file:missing.png");
        System.out.println("missing: error " + missing.isError() + ", " + missing.getException() + ", " + missing.getWidth() + ", reader " + missing.getPixelReader());
        try {
            new Image("picture.png");
        } catch (IllegalArgumentException e) {
            System.out.println("without file: " + e.getMessage());
        }
        // Addresses that name no file to read: an empty path, folders (also with a query or a
        // fragment), another computer, and a path that can't be decoded. Each is an error image.
        new java.io.File("files").mkdir();
        for (String u : new String[] { "file:", "file:files/", "file:files", "file:.arena", "file:files?q", "file:files#f", "file://localhost", "file://localhost/nope.png", "file://nohost.invalid/x.png", "file:a%2" }) {
            Image odd = new Image(u);
            System.out.println("[" + u + "]: error " + odd.isError() + ", " + odd.getException() + ", " + odd.getWidth());
        }
        Image notAPicture = new Image("file:.arena/events.txt");
        System.out.println("not a picture: " + notAPicture.getException());
        // PNG files whose compressed pixels are broken: the browser engine's Inflater reports bad
        // data differently from the JDK's, and the library must give the same error image.
        for (String name : new String[] { "bad-header", "bad-block", "bad-stored", "cut-short", "too-little" }) {
            Image broken = new Image("file:" + name + ".png");
            System.out.println(name + ": error " + broken.isError() + ", " + broken.getException() + ", " + broken.getWidth());
        }
    }
}
