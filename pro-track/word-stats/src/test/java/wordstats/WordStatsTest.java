package wordstats;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

// Step 6: WordStats.run, the whole program.
// The tests give run two PrintStreams that write into memory instead of the screen, and then
// look at what was printed.
public class WordStatsTest {

    @TempDir
    Path folder;

    private ByteArrayOutputStream outBytes;
    private ByteArrayOutputStream errBytes;
    private PrintStream out;
    private PrintStream err;

    @BeforeEach
    public void setUp() {
        outBytes = new ByteArrayOutputStream();
        errBytes = new ByteArrayOutputStream();
        out = new PrintStream(outBytes, true, StandardCharsets.UTF_8);
        err = new PrintStream(errBytes, true, StandardCharsets.UTF_8);
    }

    private int run(String... args) {
        return WordStats.run(args, out, err);
    }

    private String out() {
        return outBytes.toString(StandardCharsets.UTF_8);
    }

    // What run printed, with Windows line breaks (\r\n, from println on Windows) turned into \n.
    private String outLines() {
        return out().replace("\r\n", "\n");
    }

    private String err() {
        return errBytes.toString(StandardCharsets.UTF_8);
    }

    private String write(String name, String text) throws IOException {
        Path file = folder.resolve(name);
        Files.writeString(file, text);
        return file.toString();
    }

    private static TextStats stats(boolean caseSensitive, String... lines) {
        TextStats stats = new TextStats(caseSensitive);
        for (String line : lines) {
            stats.addLine(line);
        }
        return stats;
    }

    @Test
    public void printsTheReportOfOneFile() throws IOException {
        String file = write("dock.txt", "Boats in the dock.\nThe dock is full.\n");
        assertEquals(0, run(file), "exit status");
        String expected = Report.format(file, stats(false, "Boats in the dock.", "The dock is full."), 10, 1);
        assertEquals(expected, out(), "what run prints for one file is Report.format's text");
        assertTrue(out().contains("  lines: 2\n"), "two lines:\n" + out());
        assertTrue(out().contains("  words: 8\n"), "eight words:\n" + out());
        assertEquals("", err(), "nothing goes to err when all is well");
    }

    @Test
    public void passesTheOptionsOn() throws IOException {
        String file = write("fish.txt", "Cod cod COD eel eel a a a a");
        assertEquals(0, run("--top", "2", "--min-length", "2", "--case-sensitive", file), "exit status");
        assertEquals(Report.format(file, stats(true, "Cod cod COD eel eel a a a a"), 2, 2), out());
        assertTrue(out().contains("  eel\n"), "with --case-sensitive and --min-length 2, eel is the most frequent:\n" + out());
        assertFalse(out().contains("  a\n"), "--min-length 2 leaves a out:\n" + out());
    }

    @Test
    public void printsEachFileThenTheTotal() throws IOException {
        String first = write("first.txt", "net net boat\n");
        String second = write("second.txt", "boat\nquay\n");
        assertEquals(0, run(first, second), "exit status");
        String text = out();
        String firstReport = Report.format(first, stats(false, "net net boat"), 10, 1);
        String secondReport = Report.format(second, stats(false, "boat", "quay"), 10, 1);
        String totalReport = Report.format(Report.TOTAL, stats(false, "net net boat", "boat", "quay"), 10, 1);
        int a = text.indexOf(firstReport);
        int b = text.indexOf(secondReport);
        int c = text.indexOf(totalReport);
        assertTrue(a >= 0, "the first file's report is missing:\n" + text);
        assertTrue(b > a, "the second file's report should come after the first one's:\n" + text);
        assertTrue(c > b, "the total should come last, titled " + Report.TOTAL + ":\n" + text);
        assertTrue(text.contains("  lines: 3\n"), "the total has three lines:\n" + text);
        assertEquals(firstReport + "\n" + secondReport + "\n" + totalReport, outLines(),
                "the reports with an empty line between them, and an empty line before the total");
    }

    @Test
    public void totalUsesTheCaseSensitiveSetting() throws IOException {
        String first = write("upper.txt", "Cod cod\n");
        String second = write("lower.txt", "COD\n");
        assertEquals(0, run("--case-sensitive", first, second), "exit status");
        String total = Report.format(Report.TOTAL, stats(true, "Cod cod", "COD"), 10, 1);
        assertTrue(outLines().endsWith("\n" + total),
                "with --case-sensitive, the total counts Cod, cod and COD as three words:\n" + out());
    }

    @Test
    public void oneFileHasNoTotal() throws IOException {
        String file = write("solo.txt", "gull\n");
        run(file);
        assertFalse(out().contains(Report.TOTAL + "\n"), "no total for a single file:\n" + out());
    }

    @Test
    public void helpPrintsTheUsage() {
        assertEquals(0, run("--help"), "exit status");
        assertEquals(Report.usage(), out(), "--help prints Report.usage()");
    }

    @Test
    public void helpWinsOverFiles() throws IOException {
        String file = write("skip.txt", "gull\n");
        assertEquals(0, run(file, "-h"), "exit status");
        assertEquals(Report.usage(), out(), "with --help, only the usage is printed");
    }

    @Test
    public void wrongArgumentsGiveStatusTwo() {
        assertEquals(2, run("--top", "zero", "a.txt"), "exit status");
        assertTrue(err().contains("--top"), "the message from CommandLine.parse goes to err:\n" + err());
        assertEquals("", out(), "nothing goes to out");
    }

    @Test
    public void noArgumentsGiveStatusTwo() {
        assertEquals(2, run(), "exit status");
        assertFalse(err().isBlank(), "err should say what is wrong");
    }

    @Test
    public void missingFileGivesStatusOneAndTheOthersAreStillCounted() throws IOException {
        String missing = folder.resolve("missing.txt").toString();
        String file = write("there.txt", "quay\n");
        assertEquals(1, run(missing, file), "exit status");
        assertTrue(err().contains(missing), "err should name the file that couldn't be read:\n" + err());
        assertTrue(out().contains(Report.format(file, stats(false, "quay"), 10, 1)), "the other file is still counted:\n" + out());
    }

    @Test
    public void noTotalWhenOnlyOneOfTwoFilesWasRead() throws IOException {
        String file = write("alone.txt", "pier pier\n");
        String missing = folder.resolve("missing.txt").toString();
        assertEquals(1, run(file, missing), "exit status");
        assertEquals(Report.format(file, stats(false, "pier pier"), 10, 1), out(),
                "only one file was read, so only its report is printed, with no total");
    }

    @Test
    public void totalCountsOnlyTheFilesThatWereRead() throws IOException {
        String missing = folder.resolve("missing.txt").toString();
        String first = write("one.txt", "eel\n");
        String second = write("two.txt", "eel pike\n");
        assertEquals(1, run(first, missing, second), "exit status");
        String total = Report.format(Report.TOTAL, stats(false, "eel", "eel pike"), 10, 1);
        assertTrue(out().contains(total), "the total of the two files that were read:\n" + out());
    }
}
