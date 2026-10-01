import java.io.IOException;
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<String> names = new ArrayList<>();
        try {
            names.add("Ada");
            System.out.println(names);
        } catch (IOException e) {
            System.out.println("Could not add: " + e.getMessage());
        }
    }
}
