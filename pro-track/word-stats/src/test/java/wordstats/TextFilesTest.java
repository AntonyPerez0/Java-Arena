package wordstats;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

// Step 4: TextFiles.read.
// JUnit gives each test an empty temporary folder in folder (@TempDir) and deletes it afterward.
public class TextFilesTest {

    @TempDir
    Path folder;

    private Path write(String name, String text) throws IOException {
        Path file = folder.resolve(name);
        Files.writeString(file, text);
        return file;
    }

    @Test
    public void readsEveryLineOfAFile() throws IOException {
        Path file = write("log.txt", "Fog at dawn.\nThe fog lifted.\nSun.\n");
        TextStats stats = TextFiles.read(file, false);
        assertEquals(3, stats.lineCount(), "lineCount");
        assertEquals(12 + 15 + 4, stats.characterCount(), "characterCount (line breaks don't count)");
        assertEquals(7, stats.wordCount(), "wordCount");
        assertEquals(2, stats.countOf("fog"), "countOf(\"fog\")");
    }

    @Test
    public void lastLineWithoutALineBreakStillCounts() {
        assertLines(2, "one\ntwo");
    }

    @Test
    public void lineBreakAtTheEndDoesNotAddALine() {
        assertLines(2, "one\ntwo\n");
    }

    @Test
    public void emptyLinesInTheMiddleCount() {
        assertLines(4, "one\n\n\ntwo\n");
    }

    @Test
    public void emptyFileHasNoLines() throws IOException {
        TextStats stats = TextFiles.read(write("empty.txt", ""), false);
        assertEquals(0, stats.lineCount(), "lineCount");
        assertEquals(0, stats.characterCount(), "characterCount");
        assertEquals(0, stats.wordCount(), "wordCount");
        assertEquals(List.of(), stats.mostFrequent(10, 1), "mostFrequent");
    }

    @Test
    public void windowsLineBreaksAreLineBreaksToo() throws IOException {
        TextStats stats = TextFiles.read(write("windows.txt", "net\r\nboat\r\n"), false);
        assertEquals(2, stats.lineCount(), "lineCount");
        assertEquals(7, stats.characterCount(), "characterCount: \\r\\n is a line break, not two characters");
    }

    @Test
    public void readsTheFileAsUtf8() throws IOException {
        TextStats stats = TextFiles.read(write("accents.txt", "Café crème, café noir."), false);
        assertEquals(22, stats.characterCount(), "characterCount: é is one character");
        assertEquals(2, stats.countOf("café"), "countOf(\"café\")");
    }

    @Test
    public void passesCaseSensitiveOn() throws IOException {
        Path file = write("case.txt", "Quay quay QUAY");
        assertEquals(3, TextFiles.read(file, false).countOf("quay"), "not case sensitive");
        assertEquals(1, TextFiles.read(file, true).countOf("quay"), "case sensitive");
        assertEquals(3, TextFiles.read(file, true).distinctWordCount(), "case sensitive: distinctWordCount");
    }

    @Test
    public void missingFileThrowsAnIOException() {
        Path missing = folder.resolve("no-such-file.txt");
        assertThrows(IOException.class, () -> TextFiles.read(missing, false));
    }

    @Test
    public void eachReadStartsFromZero() throws IOException {
        Path file = write("twice.txt", "eel eel\n");
        TextFiles.read(file, false);
        TextStats second = TextFiles.read(file, false);
        assertEquals(1, second.lineCount(), "lineCount of the second read");
        assertEquals(2, second.countOf("eel"), "countOf(\"eel\") of the second read");
    }

    private void assertLines(int expected, String text) {
        try {
            TextStats stats = TextFiles.read(write("lines.txt", text), false);
            assertEquals(expected, stats.lineCount(), "lineCount of " + text.replace("\n", "\\n"));
        } catch (IOException e) {
            throw new AssertionError("couldn't read the file", e);
        }
    }
}
