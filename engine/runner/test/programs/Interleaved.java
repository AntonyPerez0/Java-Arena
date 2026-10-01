// Writes to stdout and stderr in turn: with both going to one place (2>&1), the lines must come
// out in the order they were written, as a terminal shows them.
public class Interleaved {
    public static void main(String[] args) throws InterruptedException {
        System.out.println("Reading scores.txt");
        System.err.println("Warning: line 2 is not a number");
        System.out.print("Total: ");
        System.out.println(42);
        System.err.print("Error: ");
        System.err.println("no file named other.txt");
        System.out.printf("%d lines read%n", 3);
        for (int i = 0; i < 3; i++) {
            System.out.println("out " + i);
            System.err.println("err " + i);
        }
        // Long enough for the runner to send what waits on a newline.
        Thread.sleep(60);
        System.out.println("after a pause ä");
        System.err.println("error after a pause");
        System.out.print("no newline, then ");
        System.err.print("an error without one");
        System.err.println();
        System.out.println("Last line");
        throw new IllegalStateException("stopped on purpose");
    }
}
