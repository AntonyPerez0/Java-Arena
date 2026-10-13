package wordstats;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Counts the lines, characters and words of a text, given one line at a time.
 */
public class TextStats {

    private final boolean caseSensitive;
    private final Map<String, Integer> counts;
    private int lines;
    private int characters;
    private int words;

    /**
     * Empty statistics. When caseSensitive is false, words are counted in lower case, so "Tide"
     * and "tide" are the same word.
     */
    public TextStats(boolean caseSensitive) {
        this.caseSensitive = caseSensitive;
        this.counts = new HashMap<>();
    }

    /** Adds one line of text (without its line break). */
    public void addLine(String line) {
        lines++;
        characters += line.length();
        for (String word : Words.split(line)) {
            String key = normalize(word);
            counts.put(key, counts.getOrDefault(key, 0) + 1);
            words++;
        }
    }

    /** How many lines were added. */
    public int lineCount() {
        return lines;
    }

    /** How many characters the lines had together, spaces included, line breaks not. */
    public int characterCount() {
        return characters;
    }

    /** How many words the lines had together. */
    public int wordCount() {
        return words;
    }

    /** How many different words the lines had. */
    public int distinctWordCount() {
        return counts.size();
    }

    /** How many times the word appeared (0 if never). Ignores case unless case sensitive. */
    public int countOf(String word) {
        return counts.getOrDefault(normalize(word), 0);
    }

    /**
     * The n most frequent words of at least minLength characters: the most frequent first, words
     * with the same count in alphabetical order. Fewer than n when there aren't that many words,
     * and an empty list when n is 0 or less.
     */
    public List<WordCount> mostFrequent(int n, int minLength) {
        List<WordCount> all = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (entry.getKey().length() >= minLength) {
                all.add(new WordCount(entry.getKey(), entry.getValue()));
            }
        }
        all.sort((a, b) -> {
            if (a.count() != b.count()) {
                return Integer.compare(b.count(), a.count());
            }
            return a.word().compareTo(b.word());
        });
        if (n <= 0) {
            return new ArrayList<>();
        }
        return new ArrayList<>(all.subList(0, Math.min(n, all.size())));
    }

    /** Adds everything other counted to these statistics. other doesn't change. */
    public void addAll(TextStats other) {
        lines += other.lines;
        characters += other.characters;
        words += other.words;
        for (Map.Entry<String, Integer> entry : other.counts.entrySet()) {
            String key = normalize(entry.getKey());
            counts.put(key, counts.getOrDefault(key, 0) + entry.getValue());
        }
    }

    private String normalize(String word) {
        if (caseSensitive) {
            return word;
        }
        return word.toLowerCase(Locale.ROOT);
    }
}
