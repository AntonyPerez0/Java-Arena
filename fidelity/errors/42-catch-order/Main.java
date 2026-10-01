import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        try {
            int number = Integer.valueOf(args[0]);
            System.out.println(number * 2);
        } catch (Exception e) {
            System.out.println("Something went wrong");
        } catch (NumberFormatException e) {
            System.out.println("Not a number");
        }
        System.out.println(firstLine("data.txt"));
    }

    public static String firstLine(String file) {
        try (Scanner scanner = new Scanner(new File(file))) {
            return scanner.nextLine();
        } catch (IOException e) {
            return "could not read";
        } catch (FileNotFoundException e) {
            return "no file";
        }
    }
}
