import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) throws IOException {
        List<String> lines = Files.readAllLines(Paths.get("data.txt"));
        System.out.println(lines.size() + " lines: " + lines);
        System.out.println(Files.lines(Paths.get("data.txt")).filter(l -> l.startsWith("b")).count());
        try (Scanner scanner = new Scanner(Paths.get("data.txt"))) {
            while (scanner.hasNextLine()) {
                String[] parts = scanner.nextLine().split(",");
                System.out.println(parts[0].toUpperCase() + " = " + Integer.valueOf(parts[1].trim()) * 2);
            }
        }
        try (Scanner scanner = new Scanner(new File("data.txt"))) {
            System.out.println("First via File: " + scanner.nextLine());
        }
        try (BufferedReader reader = new BufferedReader(new FileReader("data.txt"))) {
            System.out.println("First via reader: " + reader.readLine());
        }
        Files.writeString(Path.of("out.txt"), "written by writeString\n");
        Files.writeString(Path.of("out.txt"), "appended line\n", StandardOpenOption.APPEND);
        try (PrintWriter writer = new PrintWriter("report.txt")) {
            writer.println("Report");
            writer.printf("%d items%n", lines.size());
        }
        try (FileWriter writer = new FileWriter("report.txt", true)) {
            writer.write("appended by FileWriter\n");
        }
        Files.write(Paths.get("list.txt"), List.of("one", "two"));
        System.out.print(Files.readString(Path.of("out.txt")));
        System.out.println(Files.readAllLines(Paths.get("report.txt")));
        System.out.println(Files.readAllLines(Paths.get("list.txt")) + " " + Files.exists(Paths.get("list.txt"))
                + " " + Files.exists(Paths.get("nothing.txt")) + " " + new File("data.txt").exists());
        try {
            Files.readAllLines(Paths.get("missing.txt"));
        } catch (IOException e) {
            System.out.println("NIO: " + e);
        }
        try {
            new Scanner(new File("missing.txt"));
        } catch (IOException e) {
            System.out.println("File: " + e);
        }
        try {
            new FileReader("missing.txt");
        } catch (IOException e) {
            System.out.println("Reader: " + e);
        }
    }
}
