import java.util.List;

public class UncaughtLambda {
    public static void main(String[] args) {
        List<String> words = List.of("one", "two", "three");
        words.forEach(w -> {
            if (w.equals("three")) {
                throw new IllegalArgumentException("bad word: " + w);
            }
            System.out.println(w);
        });
    }
}
