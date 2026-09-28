import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        long start = System.nanoTime();
        for (int i = 3; i >= 1; i--) {
            System.out.println(i + "...");
            Thread.sleep(20);
        }
        TimeUnit.MILLISECONDS.sleep(5);
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;
        System.out.println("Liftoff! Waited at least 65 ms: " + (elapsedMs >= 65));
    }
}
