// Probe: several windows: the main one first, then the others in the order they were first shown;
// a window without a title; setRoot; hide and show again; closing windows; #N across windows. (A
// window shown without a scene isn't here: headless JavaFX fails on one in its next pulse.)
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    private Stage second;
    private Stage third;
    private Stage empty;

    @Override
    public void start(Stage stage) {
        Button open = new Button("Open");
        open.setOnAction(e -> {
            if (second == null) {
                second = new Stage();
                second.setTitle("Second");
                Button closeMe = new Button("Close second");
                closeMe.setOnAction(x -> second.close());
                second.setScene(new Scene(new VBox(new Label("second window"), closeMe)));
                third = new Stage();
                Label thirdLabel = new Label("third, no title");
                third.setScene(new Scene(new HBox(thirdLabel)));
                empty = new Stage();
                empty.setTitle("Fourth");
                empty.setScene(new Scene(new StackPane(new Label("fourth"))));
            }
            third.show();
            second.show();
            empty.show();
            System.out.println("opened: second showing " + second.isShowing() + ", third " + third.isShowing() + ", fourth " + empty.isShowing());
        });
        Button hideSecond = new Button("Hide second");
        hideSecond.setOnAction(e -> {
            second.hide();
            System.out.println("second hidden: " + !second.isShowing());
        });
        Button root = new Button("New root");
        root.setOnAction(e -> {
            Scene scene = third.getScene();
            VBox fresh = new VBox(new Label("a new root"));
            scene.setRoot(fresh);
            System.out.println("root replaced: " + (scene.getRoot() == fresh));
        });
        Button move = new Button("Swap scenes");
        move.setOnAction(e -> {
            Scene a = third.getScene();
            Scene b = empty.getScene();
            third.setScene(b);
            empty.setScene(a);
            System.out.println("swapped scenes: " + (third.getScene() == b) + " " + (empty.getScene() == a));
        });
        Button closeAll = new Button("Close others");
        closeAll.setOnAction(e -> {
            second.close();
            third.close();
            empty.hide();
        });
        Stage never = new Stage();
        never.close();
        never.hide();
        System.out.println("a stage never shown, closed: showing " + never.isShowing());
        Button twice = new Button("Twice");
        twice.setOnAction(e -> {
            third.show();
            third.show();
            third.hide();
            third.hide();
            third.show();
            System.out.println("third after show, show, hide, hide, show: " + third.isShowing());
        });
        stage.setTitle("Main");
        stage.setWidth(300);
        stage.setHeight(200);
        stage.setResizable(false);
        System.out.println("size before show " + stage.getWidth() + " x " + stage.getHeight() + ", resizable " + stage.isResizable());
        stage.setScene(new Scene(new VBox(open, hideSecond, root, move, closeAll, twice)));
        stage.show();
    }

    @Override
    public void stop() {
        System.out.println("stop");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
