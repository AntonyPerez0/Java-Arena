public class Loop10M {
    public static void main(String[] args) {
        long sum = 0;
        for (int i = 0; i < 10_000_000; i++) {
            sum += i % 7;
        }
        System.out.println(sum);
    }
}
