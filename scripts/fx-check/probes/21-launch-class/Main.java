// Probe: Main isn't the Application: launch(Class, args) starts another class (a null argument is
// left out of its parameters), which closes its own window from a handler, so the session ends;
// then main goes on.
import javafx.application.Application;

public class Main {
    public static void main(String[] args) {
        System.out.println("main starts the app");
        Application.launch(TodoApp.class, "--user=Ada", null, "list", "--1=one");
        System.out.println("back in main");
    }
}
