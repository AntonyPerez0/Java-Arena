import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("How many cups?");
        int cups = Integer.valueOf(scanner.nextLine());
        System.out.println("Who is drinking?");
        String name = scanner.nextLine();
        System.out.println(name + " drinks " + cups + " cups, that is " + (cups * 2.5) + " dl.");
    }
}
