import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Scanner;

public class Main {
    public static void setAge(int age) {
        if (age < 0) {
            throw "The age can't be negative";
        }
    }

    public static void setName(String name) {
        if (name.isEmpty()) {
            throw IllegalArgumentException("The name can't be empty");
        }
    }

    public static String firstLine(String file) {
        try (Scanner scanner = new Scanner(new File(file))) {
            return scanner.nextLine();
        } catch (FileNotFoundException | IOException e) {
            return "no file";
        }
    }

    public static void main(String[] args) {
        setAge(30);
        setName("Ada");
        System.out.println(firstLine("data.txt"));
    }
}
