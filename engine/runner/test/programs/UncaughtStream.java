import java.util.stream.IntStream;

public class UncaughtStream {
    public static void main(String[] args) {
        int sum = IntStream.range(-2, 3).map(i -> 10 / i).sum();
        System.out.println(sum);
    }
}
