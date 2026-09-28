import java.util.HashMap;

public class Main {
    public static void main(String[] args) {
        int limit = 1_000_000;
        boolean[] composite = new boolean[limit + 1];
        int primes = 0;
        for (int i = 2; i <= limit; i++) {
            if (!composite[i]) {
                primes++;
                for (long j = (long) i * i; j <= limit; j += i) {
                    composite[(int) j] = true;
                }
            }
        }
        System.out.println("Primes below one million: " + primes);
        HashMap<Integer, Integer> counts = new HashMap<>();
        for (int i = 0; i < 100_000; i++) {
            counts.merge(i % 997, 1, Integer::sum);
        }
        System.out.println(counts.size() + " " + counts.get(0) + " " + counts.get(996));
        System.err.println("exiting with status 2");
        System.exit(2);
    }
}
