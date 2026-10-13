package wordstats;

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
        // TODO: Step 1. Go through the line one character at a time and collect the words.
        //  Character.isLetterOrDigit(c) tells whether c is a letter or a digit.
        throw new UnsupportedOperationException("Words.split isn't written yet (step 1)");
    }
}
