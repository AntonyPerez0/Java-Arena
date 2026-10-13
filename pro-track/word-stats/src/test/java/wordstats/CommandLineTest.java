package wordstats;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

// Step 5: CommandLine.parse.
public class CommandLineTest {

    private static Options parse(String... args) {
        return CommandLine.parse(args);
    }

    /** Checks that parse refuses args with an IllegalArgumentException whose message has mention in it. */
    private static void assertRefused(String mention, String... args) {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> CommandLine.parse(args),
                "parse(" + String.join(" ", args) + ") should throw an IllegalArgumentException");
        assertTrue(e.getMessage() != null && e.getMessage().contains(mention),
                "the message should mention " + mention + " so the user knows what to fix; it was: " + e.getMessage());
    }

    @Test
    public void oneFileGetsTheDefaults() {
        Options options = parse("notes.txt");
        assertEquals(List.of("notes.txt"), options.files(), "files");
        assertEquals(10, options.top(), "top");
        assertEquals(1, options.minLength(), "minLength");
        assertFalse(options.caseSensitive(), "caseSensitive");
        assertFalse(options.help(), "help");
    }

    @Test
    public void filesKeepTheirOrder() {
        assertEquals(List.of("b.txt", "a.txt", "docs/c.md"), parse("b.txt", "a.txt", "docs/c.md").files());
    }

    @Test
    public void sameFileTwiceIsListedTwice() {
        assertEquals(List.of("a.txt", "a.txt"), parse("a.txt", "a.txt").files());
    }

    @Test
    public void readsTop() {
        Options options = parse("--top", "3", "notes.txt");
        assertEquals(3, options.top(), "top");
        assertEquals(List.of("notes.txt"), options.files(), "the number after --top is not a file");
    }

    @Test
    public void readsMinLength() {
        Options options = parse("--min-length", "5", "notes.txt");
        assertEquals(5, options.minLength(), "minLength");
        assertEquals(10, options.top(), "top keeps its default");
        assertEquals(List.of("notes.txt"), options.files(), "the number after --min-length is not a file");
    }

    @Test
    public void readsCaseSensitive() {
        Options options = parse("--case-sensitive", "notes.txt");
        assertTrue(options.caseSensitive(), "caseSensitive");
        assertEquals(List.of("notes.txt"), options.files(), "files");
    }

    @Test
    public void optionsMayComeAfterAndBetweenFiles() {
        Options options = parse("a.txt", "--top", "2", "b.txt", "--case-sensitive", "c.txt", "--min-length", "4");
        assertEquals(List.of("a.txt", "b.txt", "c.txt"), options.files(), "files");
        assertEquals(2, options.top(), "top");
        assertEquals(4, options.minLength(), "minLength");
        assertTrue(options.caseSensitive(), "caseSensitive");
    }

    @Test
    public void largeNumbersAreFine() {
        assertEquals(500, parse("--top", "500", "a.txt").top());
    }

    @Test
    public void helpNeedsNoFiles() {
        Options options = parse("--help");
        assertTrue(options.help(), "help");
        assertEquals(List.of(), options.files(), "files");
    }

    @Test
    public void shortHelpWorksToo() {
        assertTrue(parse("-h").help(), "-h means --help");
    }

    @Test
    public void helpWithFilesIsStillHelp() {
        Options options = parse("a.txt", "--help");
        assertTrue(options.help(), "help");
        assertEquals(List.of("a.txt"), options.files(), "files");
    }

    @Test
    public void noArgumentsIsAMistake() {
        assertThrows(IllegalArgumentException.class, () -> CommandLine.parse(new String[0]),
                "with no files there is nothing to count");
    }

    @Test
    public void optionsWithoutFilesIsAMistake() {
        assertThrows(IllegalArgumentException.class, () -> CommandLine.parse(new String[] {"--top", "3", "--case-sensitive"}),
                "with no files there is nothing to count");
    }

    @Test
    public void topWithoutANumberIsAMistake() {
        assertRefused("--top", "a.txt", "--top");
    }

    @Test
    public void topWithSomethingElseThanANumberIsAMistake() {
        assertRefused("--top", "--top", "three", "a.txt");
        assertRefused("--top", "--top", "a.txt");
        assertRefused("--top", "--top", "2.5", "a.txt");
    }

    @Test
    public void topBelowOneIsAMistake() {
        assertRefused("--top", "--top", "0", "a.txt");
        assertRefused("--top", "--top", "-4", "a.txt");
    }

    @Test
    public void minLengthMistakesNameTheOption() {
        assertRefused("--min-length", "a.txt", "--min-length");
        assertRefused("--min-length", "--min-length", "long", "a.txt");
        assertRefused("--min-length", "--min-length", "0", "a.txt");
    }

    @Test
    public void unknownOptionIsAMistake() {
        assertRefused("--color", "--color", "a.txt");
        assertRefused("-x", "a.txt", "-x");
        assertRefused("--TOP", "--TOP", "3", "a.txt");
    }
}
