package wordstats;

import java.util.List;

/**
 * Counts the lines, characters and words of a text, given one line at a time.
 */
public class TextStats {

    // TODO: Step 2. Add the fields you need: whether case matters, the counts so far,
    //  and a HashMap<String, Integer> from each word to how many times it appeared.

    /**
     * Empty statistics. When caseSensitive is false, words are counted in lower case, so "Tide"
     * and "tide" are the same word.
     */
    public TextStats(boolean caseSensitive) {
        // TODO: Step 2. Set up the fields.
    }

    /** Adds one line of text (without its line break). */
    public void addLine(String line) {
        // TODO: Step 2. Count the line, its characters and its words (use Words.split).
        throw new UnsupportedOperationException("TextStats.addLine isn't written yet (step 2)");
    }

    /** How many lines were added. */
    public int lineCount() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("TextStats.lineCount isn't written yet (step 2)");
    }

    /** How many characters the lines had together, spaces included, line breaks not. */
    public int characterCount() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("TextStats.characterCount isn't written yet (step 2)");
    }

    /** How many words the lines had together. */
    public int wordCount() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("TextStats.wordCount isn't written yet (step 2)");
    }

    /** How many different words the lines had. */
    public int distinctWordCount() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("TextStats.distinctWordCount isn't written yet (step 2)");
    }

    /** How many times the word appeared (0 if never). Ignores case unless case sensitive. */
    public int countOf(String word) {
        // TODO: Step 2.
        throw new UnsupportedOperationException("TextStats.countOf isn't written yet (step 2)");
    }

    /**
     * The n most frequent words of at least minLength characters: the most frequent first, words
     * with the same count in alphabetical order. Fewer than n when there aren't that many words,
     * and an empty list when n is 0 or less.
     */
    public List<WordCount> mostFrequent(int n, int minLength) {
        // TODO: Step 3. Make a WordCount of each word that is long enough, sort them, keep n.
        throw new UnsupportedOperationException("TextStats.mostFrequent isn't written yet (step 3)");
    }

    /** Adds everything other counted to these statistics. other doesn't change. */
    public void addAll(TextStats other) {
        // TODO: Step 3. Add other's counts to these ones, word by word.
        throw new UnsupportedOperationException("TextStats.addAll isn't written yet (step 3)");
    }
}
