import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        try {
            int number = Integer.valueOf(scanner.nextLine());
            System.out.println("Read " + number);
        } catch (NumberFormatException e) {
            System.out.println("Not a number");
        }
        System.out.println(e.getMessage());
        System.out.println(number * 2);
    }
}
