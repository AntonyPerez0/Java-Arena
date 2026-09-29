public class InfiniteOutput {
    public static void main(String[] args) {
        long i = 0;
        while (true) {
            System.out.print(i++ % 10);
        }
    }
}
