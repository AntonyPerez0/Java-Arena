package wordstats;

import java.io.IOException;
import java.io.PrintStream;
import java.nio.file.Path;

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
        Options options;
        try {
            options = CommandLine.parse(args);
        } catch (IllegalArgumentException e) {
            err.println("word-stats: " + e.getMessage());
            err.println();
            err.print(Report.usage());
            return 2;
        }
        if (options.help()) {
            out.print(Report.usage());
            return 0;
        }

        TextStats total = new TextStats(options.caseSensitive());
        int read = 0;
        int status = 0;
        for (String file : options.files()) {
            TextStats stats;
            try {
                stats = TextFiles.read(Path.of(file), options.caseSensitive());
            } catch (IOException e) {
                err.println("word-stats: can't read " + file + " (" + e.getClass().getSimpleName() + ")");
                status = 1;
                continue;
            }
            if (read > 0) {
                out.println();
            }
            out.print(Report.format(file, stats, options.top(), options.minLength()));
            total.addAll(stats);
            read++;
        }
        if (read >= 2) {
            out.println();
            out.print(Report.format(Report.TOTAL, total, options.top(), options.minLength()));
        }
        return status;
    }
}
