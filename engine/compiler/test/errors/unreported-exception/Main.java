import java.nio.file.Files;
import java.nio.file.Paths;

public class Main {
    static void check(int x) throws Exception {
        if (x < 0) throw new Exception("negative");
    }

    public static void main(String[] args) {
        check(-1);
        System.out.println(Files.readAllLines(Paths.get("data.txt")));
        Thread.sleep(10);
    }
}
