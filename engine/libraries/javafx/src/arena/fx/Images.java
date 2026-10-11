// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import com.sun.javafx.iio.ImageStorageException;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import javafx.scene.image.Image;
import javafx.scene.image.PixelReader;

/**
 * Loads images as JavaFX's Image does, and lets the library read an image's pixels. As in JavaFX,
 * an address needs a scheme (file:name.png is the file name.png in the program's folder): one
 * without a scheme is a class path resource in JavaFX, which a program's folder never has here, so
 * it throws JavaFX's IllegalArgumentException. A file that is missing or can't be read gives an
 * error image (width 0, isError() true, getException() the reason), never an exception from the
 * constructor. Java Arena reads PNG images only, and only from files.
 */
public final class Images {
    /** What an Image is made of. */
    public static final class Loaded {
        public final int width;
        public final int height;
        public final int[] argb;
        public final int format;
        public final Exception exception;

        public Loaded(int width, int height, int[] argb, int format, Exception exception) {
            this.width = width;
            this.height = height;
            this.argb = argb;
            this.format = format;
            this.exception = exception;
        }
    }

    /** Image registers one of these, so the library can read an image's pixels and the source of a PixelReader. */
    public interface Access {
        Loaded of(Image image);

        /** The image a PixelReader of Java Arena's reads, or null for another reader. */
        Image sourceOf(PixelReader reader);
    }

    private static Access access;

    private Images() {
    }

    public static synchronized void register(Access a) {
        if (access == null) {
            access = a;
        }
    }

    private static synchronized Access access() {
        return access;
    }

    /** The pixels and size of an image (the image class is loaded, since the caller holds one). */
    public static Loaded of(Image image) {
        return access().of(image);
    }

    private static Loaded error(Exception e) {
        return new Loaded(0, 0, null, Png.PREMULTIPLIED, e);
    }

    private static Loaded decoded(byte[] bytes) {
        try {
            Png.Decoded d = Png.decode(bytes);
            return new Loaded(d.width, d.height, d.argb, d.format, null);
        } catch (IOException | RuntimeException e) {
            // As in JavaFX, whatever goes wrong in decoding is the error image's exception.
            return error(e);
        } catch (InternalError e) {
            // Never an exception from the constructor (Png turns the engine's zlib errors into a ZipException already).
            return error(new IOException(e.getMessage(), e));
        }
    }

    /** new Image(url). */
    @SuppressWarnings("deprecation")
    public static Loaded load(String url) {
        if (url == null) {
            throw new NullPointerException("URL must not be null");
        }
        if (url.trim().isEmpty()) {
            throw new IllegalArgumentException("URL must not be empty");
        }
        if (!hasScheme(url)) {
            throw new IllegalArgumentException("Invalid URL: Invalid URL or resource not found");
        }
        URL address;
        try {
            address = new URL(url);
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Invalid URL: " + e.getMessage(), e);
        }
        if (!address.getProtocol().equals("file")) {
            return error(new IOException("Java Arena's JavaFX loads images only from files in the program's folder (file:name.png), not from " + address.getProtocol() + ": addresses"));
        }
        Loaded early = beforeOpening(address);
        if (early != null) {
            return early;
        }
        byte[] bytes;
        try (InputStream in = address.openStream()) {
            bytes = in.readAllBytes();
        } catch (IOException e) {
            return error(e);
        } catch (IllegalArgumentException e) {
            // The JDK's file: handler throws this for a path it can't decode (file:a%2): real JavaFX
            // keeps it as the error image's exception, as it does whatever loading throws.
            return error(e);
        } catch (RuntimeException | LinkageError e) {
            // A last guard: the browser engine's file: connection fails in ways the JDK's doesn't, and
            // the constructor never throws for a file that can't be read.
            return error(new IOException(e.toString(), e));
        }
        return decoded(bytes);
    }

    /**
     * What the JDK gives for a file: address that names no file to read, without opening it: the
     * browser engine's file: connection fails on these in its own way (a folder, an empty path, a
     * host), so the library decides them itself, as the JDK's file: handler and JavaFX's loader do.
     * Null when the address names something to open (a file, a missing one, or a path that can't be
     * decoded, which openStream then rejects with the JDK's own message).
     */
    private static Loaded beforeOpening(URL address) {
        String host = address.getHost();
        if (host != null && !host.isEmpty() && !host.equals("~") && !host.equalsIgnoreCase("localhost")) {
            // The JDK tries the host by FTP: an unknown host gives this. (A host that exists, such as
            // 127.0.0.1, gives a connection error there instead; Java Arena has no network.)
            return error(new UnknownHostException(host));
        }
        String path = decodePath(address.getPath());
        if (path == null) {
            return null;
        }
        if (path.isEmpty()) {
            return error(new FileNotFoundException(" (No such file or directory)"));
        }
        if (new File(path).isDirectory()) {
            // The JDK reads a folder as the list of its names, which is no image.
            return error(new ImageStorageException("No loader for image data"));
        }
        return null;
    }

    /** The path as the JDK's file: handler decodes it (%xx escapes as UTF-8, + kept), or null when it can't be decoded. */
    private static String decodePath(String s) {
        if (s.indexOf('%') < 0) {
            return s;
        }
        StringBuilder sb = new StringBuilder(s.length());
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c != '%') {
                sb.append(c);
                i++;
                continue;
            }
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            while (i < s.length() && s.charAt(i) == '%') {
                if (s.length() - i < 3) {
                    return null;
                }
                int high = Character.digit(s.charAt(i + 1), 16);
                int low = Character.digit(s.charAt(i + 2), 16);
                if (high < 0 || low < 0) {
                    return null;
                }
                bytes.write(high * 16 + low);
                i += 3;
            }
            try {
                CharBuffer chars = StandardCharsets.UTF_8.newDecoder()
                        .onMalformedInput(CodingErrorAction.REPORT)
                        .onUnmappableCharacter(CodingErrorAction.REPORT)
                        .decode(ByteBuffer.wrap(bytes.toByteArray()));
                sb.append(chars);
            } catch (CharacterCodingException e) {
                return null;
            }
        }
        return sb.toString();
    }

    /** A scheme, as in file:, is a letter, then letters, digits, +, - and ., then a colon. */
    private static boolean hasScheme(String url) {
        if (url.isEmpty() || !letter(url.charAt(0))) {
            return false;
        }
        for (int i = 1; i < url.length(); i++) {
            char c = url.charAt(i);
            if (c == ':') {
                return true;
            }
            if (!(letter(c) || (c >= '0' && c <= '9') || c == '+' || c == '-' || c == '.')) {
                return false;
            }
        }
        return false;
    }

    private static boolean letter(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
    }

    /** new Image(inputStream). */
    public static Loaded load(InputStream in) {
        if (in == null) {
            throw new NullPointerException("Input stream must not be null");
        }
        byte[] bytes;
        try {
            bytes = in.readAllBytes();
        } catch (IOException e) {
            return error(e);
        }
        return decoded(bytes);
    }

    private static void checkSize(int width, int height) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("Image dimensions must be positive (w,h > 0)");
        }
    }

    /** new WritableImage(width, height): transparent. */
    public static Loaded blank(int width, int height) {
        checkSize(width, height);
        return new Loaded(width, height, new int[width * height], Png.PREMULTIPLIED, null);
    }

    /** new WritableImage(reader, width, height): a copy of the reader's top left width x height pixels. */
    public static Loaded copy(PixelReader reader, int width, int height) {
        checkSize(width, height);
        if (reader == null) {
            throw new NullPointerException("Reader cannot be null");
        }
        Image source = access().sourceOf(reader);
        int[] argb;
        if (source != null) {
            Loaded s = of(source);
            argb = Pixels.copy(s.format, s.argb, s.width, s.height, width, height);
        } else {
            argb = new int[width * height];
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    argb[y * width + x] = Pixels.stored(reader.getArgb(x, y));
                }
            }
        }
        return new Loaded(width, height, argb, Png.PREMULTIPLIED, null);
    }
}
