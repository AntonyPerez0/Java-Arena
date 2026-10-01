import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(new File("names.txt"));
        List<String> names = List.of("a.txt", "b.txt");
        names.forEach(name -> Files.writeString(Path.of(name), name));
        try (FileWriter writer = new FileWriter("log.txt", true)) {
            writer.write("started\n");
        }
        Report report = new Report("report.txt");
        report.add(scanner.nextLine());
    }
}

class Report {
    private PrintWriter writer;

    public Report(String file) {
        this.writer = new PrintWriter(file);
    }

    public void add(String line) {
        writer.println(line);
    }
}
