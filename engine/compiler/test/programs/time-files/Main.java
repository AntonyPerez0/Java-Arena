import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        LocalDate d = LocalDate.of(2024, 2, 28);
        System.out.println(d + " " + d.plusDays(1) + " " + d.plusDays(2) + " " + d.getDayOfWeek() + " " + d.isLeapYear());
        System.out.println(ChronoUnit.DAYS.between(d, LocalDate.of(2024, 12, 24)) + " " + Period.between(d, LocalDate.of(2025, 5, 1)));
        System.out.println(LocalDateTime.of(2024, 1, 2, 3, 4, 5).format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")));
        System.out.println(Duration.ofMinutes(135) + " " + LocalDate.parse("2023-10-05").getMonth());
        Path dir = Files.createTempDirectory("arena");
        Path file = dir.resolve("data.txt");
        Files.write(file, List.of("first line", "second line", "ääkköset"));
        System.out.println(Files.readAllLines(file));
        try (Scanner sc = new Scanner(file)) {
            while (sc.hasNextLine()) System.out.println("> " + sc.nextLine());
        }
        try (PrintWriter pw = new PrintWriter(dir.resolve("out.csv").toFile())) {
            pw.println("name;age");
            pw.println("Ada;36");
        }
        try (BufferedReader br = new BufferedReader(new FileReader(dir.resolve("out.csv").toFile()))) {
            String line;
            while ((line = br.readLine()) != null) System.out.println(Arrays.toString(line.split(";")));
        }
        System.out.println(Files.lines(file).filter(l -> l.contains("line")).count() + " " + Files.exists(file) + " " + file.getFileName());
        Files.delete(file);
        Files.delete(dir.resolve("out.csv"));
        Files.delete(dir);
        System.out.println(Files.exists(dir));
    }
}
