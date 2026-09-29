import java.time.Duration;
import java.util.concurrent.TimeUnit;

public class SleepTimes {
    public static void main(String[] args) throws InterruptedException {
        long start = System.nanoTime();
        Thread.sleep(10);
        System.out.println("Thread.sleep(10) waited 10 ms: " + (System.nanoTime() - start >= 10_000_000L));

        start = System.nanoTime();
        TimeUnit.MILLISECONDS.sleep(5);
        System.out.println("TimeUnit.MILLISECONDS.sleep(5) waited 5 ms: " + (System.nanoTime() - start >= 5_000_000L));

        start = System.nanoTime();
        for (int i = 0; i < 50; i++) {
            Thread.sleep(Duration.ofNanos(1000));
        }
        long elapsed = System.nanoTime() - start;
        System.out.println("50 x sleep(1 us) waited 50 us: " + (elapsed >= 50_000L));
        System.out.println("50 x sleep(1 us) took under 5 s: " + (elapsed < 5_000_000_000L));

        start = System.nanoTime();
        Thread.sleep(0, 500_000);
        System.out.println("Thread.sleep(0, 500000) waited 0.5 ms: " + (System.nanoTime() - start >= 500_000L));
        System.out.println("done");
    }
}
