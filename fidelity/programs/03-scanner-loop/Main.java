import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int sum = 0;
        int count = 0;
        while (true) {
            String line = scanner.nextLine();
            if (line.equals("end")) {
                break;
            }
            int number = Integer.valueOf(line);
            if (number < 0) {
                continue;
            }
            sum += number;
            count++;
        }
        System.out.println("Sum: " + sum);
        System.out.println("Count: " + count);
        if (count > 0) {
            System.out.println("Average: " + (1.0 * sum / count));
        }
        while (scanner.hasNextInt()) {
            System.out.println("Extra: " + scanner.nextInt());
        }
        System.out.println("Rest: [" + (scanner.hasNextLine() ? scanner.nextLine() : "none") + "]");
    }
}
