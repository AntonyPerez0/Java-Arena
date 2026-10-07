// Probe: launch(Class) with an Application that has no public constructor, then launch(String...) from a class that isn't an Application.
import javafx.application.Application;

public class Main {
    public static void main(String[] args) {
        try {
            Application.launch(Hidden.class, args);
        } catch (RuntimeException e) {
            System.out.println(e.getMessage());
            System.out.println("cause " + e.getCause().getClass().getName());
        }
    }
}
