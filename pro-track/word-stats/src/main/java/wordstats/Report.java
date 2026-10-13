package wordstats;

/**
 * Turns statistics into the text the program prints. Given ready: you don't need to change it.
 */
public class Report {

    /** The title of the combined statistics, printed after the files' own when there are two or more. */
    public static final String TOTAL = "total";

    /** The help text, printed for --help (and after a mistake on the command line). */
    public static String usage() {
        return """
                Usage: word-stats [options] FILE...
                Counts the lines, words and characters of text files and lists their most frequent words.

                Options:
                  --top N           show the N most frequent words (default 10)
                  --min-length N    leave words shorter than N characters out of that list (default 1)
                  --case-sensitive  count "Tide" and "tide" as different words
                  -h, --help        show this help
                """;
    }

    /**
     * The report of one file (or of the total), for example:
     *
     * <pre>
     * samples/harbor.txt
     *   lines: 7
     *   words: 72
     *   characters: 373
     *   different words: 52
     *   most frequent:
     *         12  the
     *          3  and
     *          3  boats
     * </pre>
     *
     * The text ends with a line break.
     */
    public static String format(String title, TextStats stats, int top, int minLength) {
        StringBuilder text = new StringBuilder();
        text.append(title).append("\n");
        text.append("  lines: ").append(stats.lineCount()).append("\n");
        text.append("  words: ").append(stats.wordCount()).append("\n");
        text.append("  characters: ").append(stats.characterCount()).append("\n");
        text.append("  different words: ").append(stats.distinctWordCount()).append("\n");
        var frequent = stats.mostFrequent(top, minLength);
        if (frequent.isEmpty()) {
            text.append("  most frequent: none\n");
        } else {
            text.append("  most frequent:\n");
            for (WordCount wordCount : frequent) {
                text.append(String.format("    %6d  %s%n", wordCount.count(), wordCount.word()));
            }
        }
        return text.toString();
    }
}
