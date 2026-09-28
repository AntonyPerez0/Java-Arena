import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Main {
    static int sum(int... xs) { int s = 0; for (int x : xs) s += x; return s; }
    static long fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
    static final int CONST = 6 * 7;
    static final String GREETING = "Hi " + CONST + '!' + 1.5f + true + 'c' + 2L;

    public static void main(String[] args) throws InterruptedException {
        System.out.println(sum() + " " + sum(1) + " " + sum(1, 2, 3) + " " + fib(20) + " " + GREETING);
        outer:
        for (int i = 0; i < 5; i++) {
            for (int j = 0; j < 5; j++) {
                if (i * j == 6) { System.out.println("found " + i + "," + j); break outer; }
                if (j > i) continue outer;
            }
        }
        int k = 0;
        do { k += 3; } while (k < 10);
        var list = new ArrayList<Map<String, Integer>>();
        list.add(Map.of("k", k));
        System.out.println(k + " " + list + " " + (k > 5 ? "big" : "small"));
        int big = Integer.MAX_VALUE;
        big++;
        long l = 1L << 40;
        short sh = (short) 70000;
        byte by = (byte) 200;
        System.out.println(big + " " + l + " " + sh + " " + by + " " + (int) 3.99 + " " + (int) -3.99 + " " + (long) 1e19 + " " + (int) Double.NaN + " " + (char) 66);
        AtomicInteger counter = new AtomicInteger();
        Thread[] ts = new Thread[4];
        for (int i = 0; i < ts.length; i++) {
            ts[i] = new Thread(() -> { for (int j = 0; j < 1000; j++) counter.incrementAndGet(); });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
        System.out.println("counter " + counter.get());
        Object lock = new Object();
        synchronized (lock) { System.out.println("locked " + Thread.holdsLock(lock)); }
        StringBuilder bits = new StringBuilder();
        for (int i = 0; i < 8; i++) bits.append((0b1011_0101 >> i) & 1);
        System.out.println(bits + " " + 0x7f + " " + 017 + " " + 1_000_000 + " " + 'a' + 'b' + " " + (char) ('a' + 'b'));
        assert k < 0 : "assertions are off by default";
        System.out.println(Objects.requireNonNullElse(null, "default") + " " + Objects.equals(null, null));
        int[] counts = new int[5];
        Random r = new Random(123);
        for (int i = 0; i < 1000; i++) counts[r.nextInt(5)]++;
        System.out.println(Arrays.toString(counts));
    }
}
