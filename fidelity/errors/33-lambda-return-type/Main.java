import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

public class Main {
    public static void main(String[] args) {
        List<String> words = new ArrayList<>(List.of("stream", "map", "filter"));
        System.out.println(words.stream().filter(w -> w.length()).count());
        words.sort((a, b) -> a.length() > b.length());
        Comparator<Item> byName = (a, b) -> a.getName();
        List<Item> items = new ArrayList<>();
        items.sort((a, b) -> a.getPrice() - b.getPrice());
        System.out.println(items.stream().mapToInt(i -> i.getPrice()).sum());
        Function<Integer, Integer> doubled = x -> {
            int result = x * 2;
        };
        words.forEach(w -> w.length() * 2);
        words.forEach(w -> {
            return w.toUpperCase();
        });
        System.out.println(words.stream().map(w -> {
            System.out.println(w);
        }).count());
        System.out.println(words.stream().filter(w -> {
            if (w.isEmpty()) {
                return true;
            }
        }).count());
        String w = "taken";
        words.forEach(w -> System.out.println(w));
    }
}

class Item {
    private String name;
    private double price;

    public String getName() {
        return name;
    }

    public double getPrice() {
        return price;
    }
}
