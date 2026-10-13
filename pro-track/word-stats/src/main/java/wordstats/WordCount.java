package wordstats;

/**
 * A word and how many times it appeared. Given ready: TextStats.mostFrequent returns a list of
 * these.
 *
 * <p>A record gets its constructor, word(), count(), equals, hashCode and toString for free, so
 * the tests can compare lists of them with assertEquals.
 */
public record WordCount(String word, int count) {
}
