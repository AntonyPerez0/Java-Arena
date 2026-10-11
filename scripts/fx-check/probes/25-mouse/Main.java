import javafx.application.Application;
import javafx.application.Platform;
import javafx.event.EventType;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.control.Label;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.input.InputEvent;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.stage.Stage;

// Probe: the mouse. MouseEvent and its event types, the four handlers and their getters, and the
// order JavaFX sends the events in for clicks and drags on a canvas and on an image view (whose
// transparent pixels the mouse goes through): a drag that comes back, a release outside, a drag to
// the same point, a release handler that throws, tasks a press queues, a press that ends the
// session; and every problem of a mouse event line. The canvas is the first node of the window,
// at (0, 0), so getSceneX and getSceneY are the same as getX and getY on real JavaFX too.
public class Main extends Application {
    static String event(MouseEvent e) {
        return e.getEventType().getName() + " " + e.getX() + " " + e.getY() + " source " + e.getSource().getClass().getSimpleName();
    }

    @Override
    public void start(Stage stage) {
        EventType<MouseEvent> pressed = MouseEvent.MOUSE_PRESSED;
        System.out.println("types: " + pressed.getName() + " " + MouseEvent.MOUSE_DRAGGED + " " + MouseEvent.MOUSE_RELEASED.getName() + " " + MouseEvent.MOUSE_CLICKED.getName() + " " + (MouseEvent.MOUSE_CLICKED == MouseEvent.MOUSE_CLICKED));
        System.out.println("MouseEvent extends " + MouseEvent.class.getSuperclass().getName() + " extends " + InputEvent.class.getSuperclass().getName());
        Canvas canvas = new Canvas(200, 100);
        GraphicsContext g = canvas.getGraphicsContext2D();
        System.out.println("handlers at first: " + canvas.getOnMousePressed() + " " + canvas.getOnMouseDragged() + " " + canvas.getOnMouseReleased() + " " + canvas.getOnMouseClicked());
        Label status = new Label("nothing yet");
        canvas.setOnMousePressed(e -> {
            System.out.println("canvas " + event(e) + " scene " + e.getSceneX() + " " + e.getSceneY() + " " + (e.getEventType() == MouseEvent.MOUSE_PRESSED));
            g.setFill(Color.RED);
            g.fillOval(e.getX() - 2, e.getY() - 2, 4, 4);
            if (e.getY() == 77) {
                Platform.runLater(() -> System.out.println("task the press queued"));
            }
            if (e.getY() == 99) {
                System.out.println("the press ends the session");
                Platform.exit();
            }
        });
        canvas.setOnMouseDragged(e -> {
            System.out.println("canvas " + event(e));
            g.setStroke(Color.BLUE);
            g.strokeLine(e.getX(), e.getY(), e.getX() + 1, e.getY() + 1);
        });
        canvas.setOnMouseReleased(e -> {
            System.out.println("canvas " + event(e));
            status.setText("released at " + e.getX() + ", " + e.getY());
            if (e.getY() == 88) {
                throw new IllegalStateException("the release handler fails");
            }
        });
        canvas.setOnMouseClicked(e -> System.out.println("canvas " + event(e)));
        System.out.println("handlers set: " + (canvas.getOnMousePressed() != null) + " " + (canvas.getOnMouseDragged() != null) + " " + (canvas.getOnMouseReleased() != null) + " " + (canvas.getOnMouseClicked() != null));

        ImageView view = new ImageView(new Image("file:icon.png"));
        view.setOnMousePressed(e -> System.out.println("view " + event(e)));
        view.setOnMouseReleased(e -> System.out.println("view " + event(e)));
        view.setOnMouseClicked(e -> System.out.println("view " + event(e)));

        Canvas off = new Canvas(20, 20);
        off.setDisable(true);
        off.setOnMousePressed(e -> System.out.println("disabled canvas pressed"));
        Canvas hidden = new Canvas(20, 20);
        hidden.setVisible(false);
        ImageView empty = new ImageView();

        VBox root = new VBox(canvas, view, status, off, hidden, empty);
        stage.setScene(new Scene(root));
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
