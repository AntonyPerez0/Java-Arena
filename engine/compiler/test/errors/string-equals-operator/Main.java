import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String answer = scanner.nextLine();
        if (answer == "yes") {
            System.out.println("Not an error, but compares references");
        }
    }
}
