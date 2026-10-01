import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) throws IOException {
        // try, catch and finally, in order.
        System.out.println(divide(10, 2));
        System.out.println(divide(1, 0));

        // A multi-catch.
        for (String text : List.of("12", "abc", "5", "")) {
            try {
                int[] numbers = new int[2];
                numbers[Integer.valueOf(text) % 3] = 1;
                System.out.println("Stored " + text);
            } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
                System.out.println("Skipped: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            }
        }

        // An IllegalArgumentException from a constructor, caught.
        List<Player> players = new ArrayList<>();
        try (Scanner scanner = new Scanner(Paths.get("data", "scores.txt"))) {
            while (scanner.hasNextLine()) {
                String line = scanner.nextLine();
                if (line.isEmpty()) {
                    continue;
                }
                String[] parts = line.split(",");
                try {
                    players.add(new Player(parts[0], Integer.valueOf(parts[1])));
                } catch (NumberFormatException e) {
                    System.out.println("Not a number: " + e.getMessage());
                } catch (IllegalArgumentException e) {
                    System.out.println("Refused: " + e.getMessage());
                }
            }
        }
        System.out.println(players);

        // A checked exception of the program's own, and one with a cause.
        try {
            withdraw(100, 30);
            withdraw(20, 30);
        } catch (NotEnoughMoneyException e) {
            System.out.println(e);
            System.out.println(e.getMessage() + " / " + e.getCause());
        }
        try {
            readSettings("settings.txt");
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());
            System.out.println("Cause: " + e.getCause());
            System.out.println("Cause type: " + e.getCause().getClass().getName());
            System.out.println("Cause message: " + e.getCause().getMessage());
        }

        // Writing: PrintWriter, FileWriter with append, Files.writeString, into a new folder.
        try (PrintWriter writer = new PrintWriter("summary.txt")) {
            for (Player p : players) {
                writer.println(p.getName() + ": " + p.getPoints());
            }
            writer.printf("%d players%n", players.size());
        }
        for (int round = 1; round <= 3; round++) {
            try (FileWriter writer = new FileWriter("log.txt", true)) {
                writer.write("round " + round + "\n");
            }
        }
        try {
            new PrintWriter("reports/best.txt");
        } catch (FileNotFoundException e) {
            System.out.println("PrintWriter: " + e.getMessage());
        }
        try {
            Files.writeString(Path.of("reports", "best.txt"), "none");
        } catch (NoSuchFileException e) {
            System.out.println("writeString: " + e);
        }
        System.out.println(Files.exists(Path.of("reports")) + " " + Files.isDirectory(Path.of("data")));
        Files.createDirectories(Path.of("reports", "2024"));
        Files.createDirectories(Path.of("reports", "2024"));
        Files.writeString(Path.of("reports", "2024", "best.txt"), players.get(0).getName() + "\n");
        Files.writeString(Path.of("reports/2024/best.txt"), "(checked)\n", StandardOpenOption.APPEND);
        File folder = new File("reports");
        System.out.println(folder.isDirectory() + " " + new File(folder, "2024/best.txt").exists());

        // Reading it all back.
        System.out.print(Files.readString(Path.of("summary.txt")));
        System.out.println(Files.readAllLines(Paths.get("log.txt")));
        try (Scanner scanner = new Scanner(new File("reports/2024/best.txt"))) {
            while (scanner.hasNextLine()) {
                System.out.println("best: " + scanner.nextLine());
            }
        }
        System.out.println(finallyOrder());
    }

    public static int divide(int a, int b) {
        try {
            System.out.println("Dividing " + a + " by " + b);
            return a / b;
        } catch (ArithmeticException e) {
            System.out.println("Caught: " + e.getMessage());
            return -1;
        } finally {
            System.out.println("Finally for " + a + "/" + b);
        }
    }

    public static void withdraw(int balance, int amount) throws NotEnoughMoneyException {
        if (amount > balance) {
            throw new NotEnoughMoneyException("Balance " + balance + " is less than " + amount);
        }
        System.out.println("Withdrew " + amount + ", left " + (balance - amount));
    }

    public static void readSettings(String file) {
        try {
            Files.readAllLines(Path.of(file));
        } catch (IOException e) {
            throw new IllegalStateException("No settings in " + file, e);
        }
    }

    public static String finallyOrder() {
        StringBuilder order = new StringBuilder();
        try {
            order.append("try ");
            throw new IllegalArgumentException("stop");
        } catch (IllegalArgumentException e) {
            order.append("catch(" + e.getMessage() + ") ");
        } finally {
            order.append("finally");
        }
        return order.toString();
    }
}

class NotEnoughMoneyException extends Exception {
    public NotEnoughMoneyException(String message) {
        super(message);
    }
}

class Player {
    private String name;
    private int points;

    public Player(String name, int points) {
        if (points < 0) {
            throw new IllegalArgumentException("Points can't be negative: " + name + " has " + points);
        }
        this.name = name;
        this.points = points;
    }

    public String getName() {
        return name;
    }

    public int getPoints() {
        return points;
    }

    @Override
    public String toString() {
        return name + " (" + points + ")";
    }
}
