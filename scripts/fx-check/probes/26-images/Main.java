import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Random;
import java.util.concurrent.Callable;
import java.util.zip.CRC32;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.image.PixelReader;
import javafx.scene.image.PixelWriter;
import javafx.scene.image.WritableImage;
import javafx.scene.layout.FlowPane;
import javafx.scene.paint.Color;
import javafx.stage.Stage;

// Probe: images. Every kind of PNG file the decoder reads (made by Pngs.java) and broken ones, read
// from a file: URL and from a stream, every pixel; the URL forms Image accepts and refuses; the
// six images of content/assets; WritableImage blank and copied (also bigger or smaller than the
// source), PixelReader and PixelWriter with their errors, a setColor and getColor round trip on
// thousands of colors, and premultiplied alpha; ImageView. The window shows an image view of each
// image read, so the outline compares their pixels (CRC-32) as real JavaFX's PixelReader reads them.
public class Main extends Application {
    static void p(Object o) {
        System.out.println(o);
    }

    static void t(String what, Callable<Object> c) {
        try {
            p(what + " = " + c.call());
        } catch (Throwable e) {
            p(what + " ! " + e);
        }
    }

    static String describe(Image im) {
        StringBuilder sb = new StringBuilder();
        sb.append("error=" + im.isError() + " ex=" + im.getException() + " w=" + im.getWidth() + " h=" + im.getHeight() + " reader=" + (im.getPixelReader() != null));
        if (!im.isError() && im.getPixelReader() != null) {
            PixelReader r = im.getPixelReader();
            CRC32 crc = new CRC32();
            for (int y = 0; y < im.getHeight(); y++) {
                if (im.getWidth() <= 16) {
                    sb.append("\n  ");
                }
                for (int x = 0; x < im.getWidth(); x++) {
                    int v = r.getArgb(x, y);
                    if (im.getWidth() <= 16) {
                        sb.append(String.format("%08x ", v));
                    }
                    crc.update(new byte[] { (byte) (v >>> 24), (byte) (v >>> 16), (byte) (v >>> 8), (byte) v });
                }
            }
            sb.append(" crc " + Long.toHexString(crc.getValue()));
        }
        return sb.toString();
    }

    @Override
    public void start(Stage stage) throws Exception {
        FlowPane views = new FlowPane();
        String[] names = new File("files").list();
        Arrays.sort(names);
        for (String n : names) {
            t(n + " file", () -> describe(new Image("file:files/" + n)));
            t(n + " stream", () -> {
                try (InputStream in = new FileInputStream("files/" + n)) {
                    return describe(new Image(in));
                }
            });
            Image im = new Image("file:files/" + n);
            if (!im.isError()) {
                views.getChildren().add(new ImageView(im));
            }
        }
        for (String n : new String[] { "landscape.png", "checker.png", "icon.png", "blocks.png", "photo.png", "pictures/tiny.png" }) {
            t("asset " + n, () -> describe(new Image("file:" + n)));
            views.getChildren().add(new ImageView("file:" + n));
        }
        for (String u : new String[] { "file:missing.png", "missing.png", "files/rgb8.png", "", "   ", " file:files/rgb8.png", "x:y", "C:/path.png", ":x.png", "file:", "FILE:files/rgb8.png", "/abs/path.png", "file:///nope/x.png", "file:/nope/x.png", "file:files/", "file:files/rgb8.png?x=1", "file:files/rgb8.png#frag", "file:files%2Frgb8.png", "file:files\\rgb8.png", "file: files/rgb8.png", "1x:y", "a+b.c-d:e", "file:files", "file:pictures", "file:.", "file:///", "file://localhost", "file://localhost/nope.png", "file:files?q", "file:files#f", "file:pictures/../pictures", "file:a%2", "file:a%zz.png", "file:pictures/tiny%2Epng", "file:pictures/a+b.png" }) {
            t("url [" + u + "]", () -> describe(new Image(u)));
        }
        t("null url", () -> new Image((String) null));
        t("null stream", () -> new Image((InputStream) null));
        t("failing stream", () -> describe(new Image(new InputStream() {
            @Override
            public int read() throws IOException {
                throw new IOException("broken stream");
            }
        })));

        for (String n : new String[] { "gray8.png", "gray1.png", "grayalpha8.png", "rgb8.png", "rgba8.png", "palette8.png", "palette8trns.png", "rgb16.png", "gray8trns.png", "interlaced-rgb.png", "order-palette-trns-empty.png", "order-gray-trns-0.png", "order-rgb-trns-0.png", "order-gray-trns-then-empty.png", "order-trns-before-plte.png" }) {
            Image src = new Image("file:files/" + n);
            int w = (int) src.getWidth();
            int h = (int) src.getHeight();
            for (int[] wh : new int[][] { { w + 1, h }, { w, h + 1 }, { w + 3, h + 2 }, { 1, h + 5 }, { w + 1, 1 }, { 2 * w, 2 }, { w, h }, { 2, 2 } }) {
                t("copy " + n + " " + wh[0] + "x" + wh[1], () -> describe(new WritableImage(src.getPixelReader(), wh[0], wh[1])));
            }
        }
        WritableImage wsrc = new WritableImage(3, 2);
        wsrc.getPixelWriter().setArgb(1, 0, 0x80ff8040);
        t("copy writable 4x2", () -> describe(new WritableImage(wsrc.getPixelReader(), 4, 2)));
        t("copy writable 4x1", () -> describe(new WritableImage(wsrc.getPixelReader(), 4, 1)));
        t("copy null", () -> new WritableImage(null, 2, 2));
        t("copy null bad size", () -> new WritableImage(null, 0, 2));
        t("copy error image", () -> new WritableImage(new Image("file:missing.png").getPixelReader(), 2, 2));
        t("WritableImage(0, 3)", () -> new WritableImage(0, 3));
        t("WritableImage(3, -1)", () -> new WritableImage(3, -1));
        t("blank", () -> describe(new WritableImage(3, 2)));
        WritableImage wi = new WritableImage(3, 2);
        PixelWriter pw = wi.getPixelWriter();
        for (int[] xy : new int[][] { { -1, 0 }, { 0, -1 }, { 3, 0 }, { 0, 2 }, { 2, 1 } }) {
            t("setArgb(" + xy[0] + ", " + xy[1] + ")", () -> {
                pw.setArgb(xy[0], xy[1], 0xff123456);
                return "ok";
            });
            t("setColor(" + xy[0] + ", " + xy[1] + ")", () -> {
                pw.setColor(xy[0], xy[1], Color.RED);
                return "ok";
            });
            t("setColor null (" + xy[0] + ", " + xy[1] + ")", () -> {
                pw.setColor(xy[0], xy[1], null);
                return "ok";
            });
            t("getArgb(" + xy[0] + ", " + xy[1] + ")", () -> Integer.toHexString(wi.getPixelReader().getArgb(xy[0], xy[1])));
            t("getColor(" + xy[0] + ", " + xy[1] + ")", () -> wi.getPixelReader().getColor(xy[0], xy[1]));
        }
        t("loaded image getArgb(7, 0)", () -> new Image("file:files/rgb8.png").getPixelReader().getArgb(7, 0));
        t("same writer and reader", () -> (wi.getPixelWriter() == wi.getPixelWriter()) + " " + (wi.getPixelReader() == wi.getPixelReader()));
        t("writable state", () -> wi.isError() + " " + wi.getException() + " " + wi.getWidth() + " " + wi.getHeight());

        WritableImage one = new WritableImage(1, 1);
        Random rnd = new Random(7);
        CRC32 crc = new CRC32();
        StringBuilder firsts = new StringBuilder();
        for (int i = 0; i < 20000; i++) {
            double r = rnd.nextDouble();
            double g = rnd.nextDouble();
            double b = rnd.nextDouble();
            double a = i % 3 == 0 ? 1.0 : rnd.nextDouble();
            if (i % 7 == 0) {
                a = 0;
            }
            one.getPixelWriter().setColor(0, 0, new Color(r, g, b, a));
            String s = Integer.toHexString(one.getPixelReader().getArgb(0, 0)) + " " + one.getPixelReader().getColor(0, 0);
            crc.update(s.getBytes());
            if (i < 8) {
                firsts.append(s).append("; ");
            }
        }
        p("setColor round trip " + Long.toHexString(crc.getValue()) + " " + firsts);
        Image all = new Image("file:files/allalpha.png");
        CRC32 c2 = new CRC32();
        for (int y = 0; y < 256; y += 3) {
            for (int x = 0; x < 256; x += 5) {
                Color col = all.getPixelReader().getColor(x, y);
                c2.update((col + " " + col.getRed() + " " + col.getOpacity() + " " + col.hashCode()).getBytes());
            }
        }
        p("getColor table " + Long.toHexString(c2.getValue()));
        WritableImage big = new WritableImage(256, 256);
        for (int y = 0; y < 256; y++) {
            for (int x = 0; x < 256; x++) {
                big.getPixelWriter().setArgb(x, y, (y << 24) | (x << 16) | ((255 - x) << 8) | (x ^ 0x5a));
            }
        }
        p("setArgb table " + describe(big));
        views.getChildren().add(new ImageView(big));
        WritableImage negative = new WritableImage(new Image("file:photo.png").getPixelReader(), 64, 48);
        for (int y = 0; y < 48; y++) {
            for (int x = 0; x < 64; x++) {
                negative.getPixelWriter().setColor(x, y, negative.getPixelReader().getColor(x, y).invert());
            }
        }
        views.getChildren().add(new ImageView(negative));

        Image src = new Image("file:files/rgba8.png");
        ImageView iv = new ImageView(src);
        t("image view", () -> (iv.getImage() == src) + " " + new ImageView().getImage());
        t("image view url", () -> describe(new ImageView("file:files/gray8.png").getImage()));
        t("image view url missing", () -> describe(new ImageView("file:nope.png").getImage()));
        t("image view plain url", () -> new ImageView("nope.png"));
        t("image view setImage(null)", () -> {
            iv.setImage(null);
            return iv.getImage();
        });
        views.getChildren().addAll(iv, new ImageView(new Image("file:nope.png")), new ImageView());
        stage.setScene(new Scene(views));
        stage.show();
    }

    public static void main(String[] args) throws IOException {
        Pngs.makeAll(new File("files"));
        launch(args);
    }
}
