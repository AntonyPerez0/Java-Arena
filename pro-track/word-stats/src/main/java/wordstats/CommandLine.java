package wordstats;

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
        // TODO: Step 5. Go through args, collect the options and the file names, and return them
        //  as new Options(files, top, minLength, caseSensitive, help).
        throw new UnsupportedOperationException("CommandLine.parse isn't written yet (step 5)");
    }
}
