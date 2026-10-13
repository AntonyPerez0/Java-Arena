package wordstats;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Reads text files into statistics.
 */
public class TextFiles {

    /**
     * The statistics of a UTF-8 text file, line by line. Throws an IOException when the file
     * can't be read (for example, when there is no such file).
     */
    public static TextStats read(Path file, boolean caseSensitive) throws IOException {
        // TODO: Step 4. Read the file's lines (Files.readAllLines) and add each to a new TextStats.
        throw new UnsupportedOperationException("TextFiles.read isn't written yet (step 4)");
    }
}
