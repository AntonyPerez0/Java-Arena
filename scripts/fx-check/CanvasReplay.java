// Part of Java Arena's real-JavaFX check (npm run fx-check): written for this site, not OpenJFX's code.
package arena.fxcheck;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import javafx.application.Platform;
import javafx.scene.SnapshotParameters;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.image.PixelReader;
import javafx.scene.image.WritableImage;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;

/**
 * Draws the calls that Java Arena's JavaFX recorded on a canvas again, on a new canvas of real
 * OpenJFX 21 (headless, with Monocle), and writes a snapshot of it, so scripts/fx-check can compare
 * it with the snapshot of the canvas the program drew on with real JavaFX: when the recording holds
 * every call the program made, in order, with the paint, line width and font each used, the two
 * are the same pixels.
 *
 * <pre>
 * java [Monocle flags] -cp openjfx-jars:driver arena.fxcheck.CanvasReplay OUT &lt; canvases.txt
 * </pre>
 *
 * It reads canvases from standard input, each a line {@code canvas NAME WIDTH HEIGHT N} and then N
 * lines, one per call, with these fields separated by tabs: the call's name, its numbers, the
 * polygon's xs and ys (numbers separated by commas, or "-"), the color (#rrggbb or #rrggbbaa, or
 * "-" for clearRect), the line width, and for a text its font's family and size, the text as
 * UTF-16 code units in hexadecimal ("-" for none) and the font's style ("-" for Regular). Each call
 * is made on the canvas's GraphicsContext after setting its paint (setFill or setStroke), its line
 * width (a stroke) and its font (a text: Font.font(family, size), or new Font("family style",
 * size) for a Bold or Italic one). It writes OUT/NAME.rgba: the canvas's snapshot on a
 * transparent background, as RGBA bytes (not premultiplied), row by row.
 */
public final class CanvasReplay {
    private CanvasReplay() {
    }

    public static void main(String[] args) throws Exception {
        File out = new File(args[0]);
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        List<String[]> heads = new ArrayList<String[]>();
        List<List<String[]>> bodies = new ArrayList<List<String[]>>();
        String line;
        while ((line = in.readLine()) != null) {
            if (line.isEmpty()) {
                continue;
            }
            String[] head = line.split(" ");
            int n = Integer.parseInt(head[4]);
            List<String[]> calls = new ArrayList<String[]>();
            for (int i = 0; i < n; i++) {
                calls.add(in.readLine().split("\t", -1));
            }
            heads.add(head);
            bodies.add(calls);
        }
        CountDownLatch started = new CountDownLatch(1);
        Platform.startup(started::countDown);
        started.await();
        Throwable[] failed = new Throwable[1];
        CountDownLatch done = new CountDownLatch(1);
        Platform.runLater(() -> {
            try {
                for (int i = 0; i < heads.size(); i++) {
                    String[] head = heads.get(i);
                    Canvas canvas = new Canvas(Double.parseDouble(head[2]), Double.parseDouble(head[3]));
                    GraphicsContext g = canvas.getGraphicsContext2D();
                    for (String[] call : bodies.get(i)) {
                        draw(g, call);
                    }
                    SnapshotParameters params = new SnapshotParameters();
                    params.setFill(Color.TRANSPARENT);
                    WritableImage shot = canvas.snapshot(params, null);
                    Files.write(new File(out, head[1] + ".rgba").toPath(), rgba(shot));
                }
            } catch (Throwable t) {
                failed[0] = t;
            } finally {
                done.countDown();
            }
        });
        done.await();
        Platform.exit();
        if (failed[0] != null) {
            failed[0].printStackTrace();
            System.exit(1);
        }
    }

    private static byte[] rgba(WritableImage shot) {
        int w = (int) shot.getWidth();
        int h = (int) shot.getHeight();
        PixelReader r = shot.getPixelReader();
        byte[] bytes = new byte[w * h * 4];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int v = r.getArgb(x, y);
                int k = 4 * (y * w + x);
                bytes[k] = (byte) (v >>> 16);
                bytes[k + 1] = (byte) (v >>> 8);
                bytes[k + 2] = (byte) v;
                bytes[k + 3] = (byte) (v >>> 24);
            }
        }
        return bytes;
    }

    private static void draw(GraphicsContext g, String[] f) {
        String op = f[0];
        double[] a = numbers(f[1]);
        double[] xs = numbers(f[2]);
        double[] ys = numbers(f[3]);
        if (!f[4].equals("-")) {
            Color color = Color.web(f[4]);
            if (op.startsWith("stroke")) {
                g.setStroke(color);
                g.setLineWidth(Double.parseDouble(f[5]));
            } else {
                g.setFill(color);
            }
        }
        if (!f[6].equals("-")) {
            // A style other than Regular comes from a full name (new Font("Serif Bold", 18)).
            g.setFont(f[9].equals("-") ? Font.font(f[6], Double.parseDouble(f[7])) : new Font(f[6] + " " + f[9], Double.parseDouble(f[7])));
        }
        switch (op) {
            case "fillRect":
                g.fillRect(a[0], a[1], a[2], a[3]);
                break;
            case "strokeRect":
                g.strokeRect(a[0], a[1], a[2], a[3]);
                break;
            case "clearRect":
                g.clearRect(a[0], a[1], a[2], a[3]);
                break;
            case "fillOval":
                g.fillOval(a[0], a[1], a[2], a[3]);
                break;
            case "strokeOval":
                g.strokeOval(a[0], a[1], a[2], a[3]);
                break;
            case "strokeLine":
                g.strokeLine(a[0], a[1], a[2], a[3]);
                break;
            case "fillText":
                g.fillText(text(f[8]), a[0], a[1]);
                break;
            case "strokeText":
                g.strokeText(text(f[8]), a[0], a[1]);
                break;
            case "fillPolygon":
                g.fillPolygon(xs, ys, xs.length);
                break;
            case "strokePolygon":
                g.strokePolygon(xs, ys, xs.length);
                break;
            default:
                throw new IllegalArgumentException("no such call: " + op);
        }
    }

    private static double[] numbers(String field) {
        if (field.equals("-") || field.isEmpty()) {
            return new double[0];
        }
        String[] parts = field.split(",");
        double[] out = new double[parts.length];
        for (int i = 0; i < parts.length; i++) {
            out[i] = Double.parseDouble(parts[i]);
        }
        return out;
    }

    private static String text(String field) {
        if (field.equals("-")) {
            return "";
        }
        char[] chars = new char[field.length() / 4];
        for (int i = 0; i < chars.length; i++) {
            chars[i] = (char) Integer.parseInt(field.substring(4 * i, 4 * i + 4), 16);
        }
        return new String(chars);
    }
}
