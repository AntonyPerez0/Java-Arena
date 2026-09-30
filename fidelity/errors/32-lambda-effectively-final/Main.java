import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>(List.of(4, 9, 2, 7));
        int count = 0;
        numbers.forEach(n -> count++);
        int limit = 5;
        numbers.removeIf(n -> n > limit);
        limit = 3;
        int max = 0;
        numbers.forEach(n -> {
            if (n > max) {
                max = n;
            }
        });
        for (int i = 0; i < 3; i++) {
            System.out.println(numbers.stream().filter(n -> n > i).count());
        }
        String prefix = "Number: ";
        prefix = prefix.trim();
        Runnable printer = new Runnable() {
            public void run() {
                System.out.println(prefix + count);
            }
        };
    }
}
