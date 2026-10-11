// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package com.sun.javafx.iio;

import java.io.IOException;

/**
 * The exception real JavaFX gives an image whose data no loader of its own reads (Image.getException()
 * of a file that isn't an image). It is here only so that Java Arena's JavaFX prints the same name.
 */
public class ImageStorageException extends IOException {
    private static final long serialVersionUID = 20171L;

    public ImageStorageException(String message) {
        super(message);
    }

    public ImageStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
