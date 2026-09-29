import java.util.*;

public class Typical {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        List<Integer> numbers = new ArrayList<>();
        while (true) {
            int number = Integer.valueOf(scanner.nextLine());
            if (number == -1) break;
            numbers.add(number);
        }
        int sum = 0;
        for (int n : numbers) sum += n;
        System.out.println("Count: " + numbers.size());
        System.out.println("Sum: " + sum);
        System.out.println("Average: " + (double) sum / numbers.size());
        Collections.sort(numbers);
        System.out.println("Sorted: " + numbers);
        Map<Integer, Integer> counts = new HashMap<>();
        for (int n : numbers) counts.put(n, counts.getOrDefault(n, 0) + 1);
        System.out.println("Counts: " + counts);
        StringBuilder stars = new StringBuilder();
        for (int n : numbers) stars.append("*".repeat(Math.max(0, n % 10))).append('\n');
        System.out.print(stars);
    }
}
