import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class Main {
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            numbers.add(i);
        }
        Collections.shuffle(numbers, new Random(7));
        System.out.println(numbers);
        List<String> cards = new ArrayList<>(List.of("A", "K", "Q", "J", "10", "9", "8", "7"));
        Random random = new Random(1337);
        Collections.shuffle(cards, random);
        System.out.println(cards);
        System.out.println(cards.get(random.nextInt(cards.size())));
        Collections.sort(numbers);
        Collections.reverse(numbers);
        System.out.println(numbers);
        System.out.println(Collections.max(numbers) + " " + Collections.min(numbers) + " " + Collections.frequency(cards, "Q"));
    }
}
