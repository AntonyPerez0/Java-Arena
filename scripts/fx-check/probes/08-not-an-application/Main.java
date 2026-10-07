// Probe: launch(String...) called from a class that doesn't extend Application.
import javafx.application.Application;

public class Main {
    public static void main(String[] args) {
        System.out.println("before launch");
        Application.launch(args);
        System.out.println("after launch");
    }
}
