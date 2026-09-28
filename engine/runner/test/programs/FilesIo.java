import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

public class FilesIo {
    interface Step {
        void run() throws Exception;
    }

    static void step(String label, Step step) {
        try {
            step.run();
        } catch (Exception e) {
            System.out.println(label + " threw " + e);
        }
    }

    public static void main(String[] args) throws Exception {
        Path data = Paths.get("data.txt");
        System.out.println("exists " + Files.exists(data) + " " + Files.exists(Paths.get("nope.txt")) + " " + Files.isDirectory(Paths.get(".")));
        System.out.println("size " + Files.size(data));
        List<String> lines = Files.readAllLines(data);
        System.out.println("readAllLines " + lines);
        try (Stream<String> stream = Files.lines(data)) {
            System.out.println("lines " + stream.map(String::toUpperCase).collect(Collectors.joining("|")));
        }
        System.out.println("readString [" + Files.readString(data) + "]");
        try (Scanner scanner = new Scanner(Paths.get("data.txt"))) {
            while (scanner.hasNextLine()) System.out.println("scanner path: " + scanner.nextLine());
        }
        try (Scanner scanner = new Scanner(new File("numbers.txt"))) {
            int sum = 0;
            while (scanner.hasNextInt()) sum += scanner.nextInt();
            System.out.println("scanner file sum " + sum);
        }
        try (BufferedReader reader = Files.newBufferedReader(data)) {
            System.out.println("buffered reader first " + reader.readLine());
        }
        try (BufferedReader reader = new BufferedReader(new FileReader("data.txt"))) {
            String line;
            int count = 0;
            while ((line = reader.readLine()) != null) count += line.length();
            System.out.println("file reader chars " + count);
        }

        Files.writeString(Paths.get("out1.txt"), "first\n");
        Files.writeString(Paths.get("out1.txt"), "second\n", StandardOpenOption.APPEND);
        System.out.println("append " + Files.readAllLines(Paths.get("out1.txt")));
        Files.writeString(Paths.get("out1.txt"), "x\n");
        System.out.println("truncate " + Files.readAllLines(Paths.get("out1.txt")));
        Files.write(Paths.get("out2.txt"), List.of("a", "bb", "ccc"));
        Files.write(Paths.get("out2.txt"), List.of("dddd"), StandardOpenOption.APPEND);
        Files.write(Paths.get("out3.bin"), new byte[] {1, 2, 3, 0, -1});
        System.out.println("bytes " + Arrays.toString(Files.readAllBytes(Paths.get("out3.bin"))));
        step("create new existing", () -> Files.writeString(Paths.get("out1.txt"), "y", StandardOpenOption.CREATE_NEW));
        try (BufferedWriter writer = Files.newBufferedWriter(Paths.get("out4.txt"))) {
            writer.write("buffered writer");
            writer.newLine();
            writer.write("äöå €");
        }
        System.out.println("utf8 " + Files.readString(Paths.get("out4.txt"), StandardCharsets.UTF_8).length());
        try (PrintWriter writer = new PrintWriter(new FileWriter("out5.txt"))) {
            writer.println("print writer");
            writer.printf("%d %.1f%n", 7, 2.5);
        }
        try (FileWriter writer = new FileWriter("out5.txt", true)) {
            writer.write("appended by FileWriter\n");
        }
        try (PrintWriter writer = new PrintWriter("out6.txt")) {
            writer.print("print writer from name");
        }
        System.out.println("out5 " + Files.readAllLines(Paths.get("out5.txt")));

        Files.createDirectories(Paths.get("dir/sub"));
        Files.writeString(Paths.get("dir/sub/nested.txt"), "nested");
        try (Stream<Path> listing = Files.list(Paths.get("."))) {
            System.out.println("list " + listing.map(p -> p.getFileName().toString()).sorted().toList());
        }
        Files.copy(Paths.get("out6.txt"), Paths.get("copy.txt"));
        Files.move(Paths.get("out2.txt"), Paths.get("moved.txt"));
        Files.delete(Paths.get("out3.bin"));
        System.out.println("deleteIfExists " + Files.deleteIfExists(Paths.get("out3.bin")));
        File file = new File("moved.txt");
        System.out.println("file " + file.exists() + " " + file.length() + " " + file.getName() + " " + file.isFile());
        System.out.println("new File delete " + new File("copy.txt").delete());
        System.out.println("absolute " + Paths.get("data.txt").toAbsolutePath().getFileName());

        step("readAllLines missing", () -> Files.readAllLines(Paths.get("missing.txt")));
        step("readString missing", () -> Files.readString(Paths.get("missing.txt")));
        step("lines missing", () -> Files.lines(Paths.get("missing.txt")));
        step("scanner path missing", () -> new Scanner(Paths.get("missing.txt")));
        step("scanner file missing", () -> new Scanner(new File("missing.txt")));
        step("file reader missing", () -> new FileReader("missing.txt"));
        step("file input missing", () -> new FileInputStream("dir/missing.txt"));
        step("write into missing dir", () -> Files.writeString(Paths.get("nodir/x.txt"), "x"));
        step("file writer missing dir", () -> new FileWriter("nodir/x.txt"));
        step("delete missing", () -> Files.delete(Paths.get("missing.txt")));
        step("delete non-empty dir", () -> Files.delete(Paths.get("dir")));
        step("read directory", () -> Files.readString(Paths.get("dir")));
    }
}
