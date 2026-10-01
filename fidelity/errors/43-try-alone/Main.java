import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        try {
            int age = Integer.valueOf(scanner.nextLine());
            System.out.println("Next year you are " + (age + 1));
        }
        System.out.println("Bye!");
    }
}
