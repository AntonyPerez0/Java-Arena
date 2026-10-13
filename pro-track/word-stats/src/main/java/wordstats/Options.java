package wordstats;

import java.util.List;

/**
 * What the user asked for on the command line. Given ready: CommandLine.parse makes one.
 *
 * @param files         the files to read, in the order they were given
 * @param top           how many of the most frequent words to show
 * @param minLength     the shortest word length that goes in the most frequent list
 * @param caseSensitive true when "The" and "the" are different words
 * @param help          true when the user asked for the help text
 */
public record Options(List<String> files, int top, int minLength, boolean caseSensitive, boolean help) {
}
