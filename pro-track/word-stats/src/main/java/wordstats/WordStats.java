package wordstats;

import java.io.PrintStream;

/**
 * The program: word-stats [options] FILE...
 */
public class WordStats {

    public static void main(String[] args) {
        int status = run(args, System.out, System.err);
        if (status != 0) {
            System.exit(status);
        }
    }

    /**
     * Runs the program with the command line's arguments, printing the reports to out and the
     * error messages to err. Returns the exit status: 0 when all went well, 1 when a file couldn't
     * be read, 2 when the arguments were wrong.
     */
    public static int run(String[] args, PrintStream out, PrintStream err) {
        // TODO: Step 6. Parse the arguments, read each file and print its report with
        //  Report.format, then the total when two or more files were read. README.md, step 6,
        //  has the details.
        throw new UnsupportedOperationException("WordStats.run isn't written yet (step 6)");
    }
}
