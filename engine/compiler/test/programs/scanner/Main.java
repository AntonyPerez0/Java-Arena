import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("What is your name?");
        String name = scanner.nextLine();
        System.out.println("How old are you?");
        int age = Integer.valueOf(scanner.nextLine());
        int sum = 0;
        int count = 0;
        while (true) {
            int n = Integer.parseInt(scanner.nextLine());
            if (n == 0) {
                break;
            }
            sum += n;
            count++;
        }
        System.out.println("Hi " + name + ", next year you will be " + (age + 1));
        System.out.println("Sum: " + sum + ", average: " + (1.0 * sum / count));
        System.out.printf("Average with two decimals: %.2f%n", (double) sum / count);
    }
}
