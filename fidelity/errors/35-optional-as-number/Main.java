import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> points = new ArrayList<>(List.of(4, 9, 2));
        double average = points.stream().mapToInt(p -> p).average();
        int best = points.stream().mapToInt(p -> p).max();
        int first = points.stream().filter(p -> p > 5).findFirst();
        System.out.println(points.stream().mapToDouble(p -> p).average() * 2);
        System.out.println(points.stream().mapToInt(p -> p).average().get());
    }
}
