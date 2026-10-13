package wordstats;

import java.util.ArrayList;
import java.util.List;

/**
 * Reads the command line's arguments into Options.
 */
public class CommandLine {

    /** How many of the most frequent words are shown when --top isn't given. */
    public static final int DEFAULT_TOP = 10;

    /** The shortest word in the most frequent list when --min-length isn't given. */
    public static final int DEFAULT_MIN_LENGTH = 1;

    /**
     * The options in args. Throws an IllegalArgumentException, with a message for the user, when
     * the arguments are wrong. See README.md, step 5, for the rules.
     */
    public static Options parse(String[] args) {
        List<String> files = new ArrayList<>();
        int top = DEFAULT_TOP;
        int minLength = DEFAULT_MIN_LENGTH;
        boolean caseSensitive = false;
        boolean help = false;
        int i = 0;
        while (i < args.length) {
            String arg = args[i];
            if (arg.equals("--top")) {
                top = number(args, i);
                i++;
            } else if (arg.equals("--min-length")) {
                minLength = number(args, i);
                i++;
            } else if (arg.equals("--case-sensitive")) {
                caseSensitive = true;
            } else if (arg.equals("--help") || arg.equals("-h")) {
                help = true;
            } else if (arg.startsWith("-")) {
                throw new IllegalArgumentException("unknown option " + arg);
            } else {
                files.add(arg);
            }
            i++;
        }
        if (files.isEmpty() && !help) {
            throw new IllegalArgumentException("no files given: name at least one text file");
        }
        return new Options(files, top, minLength, caseSensitive, help);
    }

    /** The whole number of at least 1 that follows the option at args[at]. */
    private static int number(String[] args, int at) {
        String option = args[at];
        if (at + 1 >= args.length) {
            throw new IllegalArgumentException(option + " needs a number after it");
        }
        int value;
        try {
            value = Integer.parseInt(args[at + 1]);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(option + " needs a whole number, not " + args[at + 1]);
        }
        if (value < 1) {
            throw new IllegalArgumentException(option + " needs a number of at least 1, not " + value);
        }
        return value;
    }
}
