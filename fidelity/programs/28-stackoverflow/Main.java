public class Main {
    static int depth = 0;

    static long countDown(long n) {
        depth++;
        return countDown(n + 1) + 1;
    }

    static long factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(factorial(20));
        try {
            countDown(0);
        } catch (StackOverflowError e) {
            System.out.println("Caught " + e.getClass().getName() + ", depth over 1000: " + (depth > 1000));
        }
        System.out.println("still running");
    }
}
