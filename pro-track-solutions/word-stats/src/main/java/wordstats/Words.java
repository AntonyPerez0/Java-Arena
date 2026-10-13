package wordstats;

import java.util.ArrayList;
import java.util.List;

/**
 * Splits text into words.
 */
public class Words {

    /**
     * The words of a line, in order, as they are written (upper and lower case kept).
     *
     * <p>A word is a run of letters, digits and apostrophes ('). Every other character (a space,
     * a comma, a hyphen, a tab...) ends the word. Apostrophes at the start or the end of a word
     * are not part of it, so 'harbor' is the word harbor, while don't stays don't. A run made of
     * apostrophes only is no word at all.
     */
    public static List<String> split(String line) {
        List<String> words = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (Character.isLetterOrDigit(c) || c == '\'') {
                current.append(c);
            } else {
                addWord(words, current.toString());
                current = new StringBuilder();
            }
        }
        addWord(words, current.toString());
        return words;
    }

    private static void addWord(List<String> words, String candidate) {
        int start = 0;
        int end = candidate.length();
        while (start < end && candidate.charAt(start) == '\'') {
            start++;
        }
        while (end > start && candidate.charAt(end - 1) == '\'') {
            end--;
        }
        if (start < end) {
            words.add(candidate.substring(start, end));
        }
    }
}
