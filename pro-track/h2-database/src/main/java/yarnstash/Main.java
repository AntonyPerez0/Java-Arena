package yarnstash;

import java.util.Scanner;

/**
 * Starts the yarn stash over a database in the file yarnstash.mv.db, in the folder you run the
 * program in. The file is made the first time, and the yarn stays in it between runs.
 *
 * <p>This class is ready: you don't need to change it.
 */
public class Main {
    public static void main(String[] args) {
        YarnDao yarns = new JdbcYarnDao("jdbc:h2:./yarnstash");
        YarnStash stash = new YarnStash(new Scanner(System.in), yarns);
        stash.start();
    }
}
