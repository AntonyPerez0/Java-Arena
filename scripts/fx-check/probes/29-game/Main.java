import java.util.ArrayList;
import java.util.List;
import javafx.animation.AnimationTimer;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Point2D;
import javafx.scene.Scene;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Stage;

/**
 * Part 14.3 on real JavaFX, as the driver runs it: shapes of every kind with their defaults, fills,
 * strokes, translate, layout and rotate in a Pane (and a moved node in a VBox, whose layout real
 * JavaFX sets itself), key events to the scene in JavaFX's order with the tasks they queue, timers
 * in start order (one started twice, one stopped and started again inside handle, one started from
 * a key handler), a timer that throws, Platform.exit() from a timer, and the frames count.
 */
public class Main extends Application {
    static final List<String> log = new ArrayList<>();
    int frame;
    AnimationTimer a;
    AnimationTimer b;
    AnimationTimer late;

    @Override
    public void start(Stage stage) {
        Pane pane = new Pane();
        pane.setPrefSize(300, 200);
        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);
        ship.setTranslateX(100);
        ship.setTranslateY(50);
        Circle rock = new Circle(20);
        rock.setLayoutX(200);
        rock.setLayoutY(150);
        rock.setFill(Color.GRAY);
        rock.setStroke(Color.RED);
        rock.setStrokeWidth(2);
        Rectangle wall = new Rectangle(10, 10, 40, 20);
        wall.setRotate(30);
        wall.setFill(null);
        Line line = new Line(0, 0, 100, 50);
        Text text = new Text(10, 20, "Points: 0");
        Text big = new Text("Big");
        big.setFont(Font.font("Serif", 20));
        big.setFill(Color.BLUE);
        Circle centered = new Circle(150, 100, 5, Color.GREEN);
        Rectangle colored = new Rectangle(5, 5, Color.web("#ff000080"));
        pane.getChildren().addAll(ship, rock, wall, line, text, big, centered, colored);
        System.out.println("defaults: " + ship.getFill() + " " + ship.getStroke() + " " + ship.getStrokeWidth() + " | " + line.getFill() + " " + line.getStroke() + " | " + text.getFill() + " " + text.getFont());
        System.out.println("bounds: " + ship.getBoundsInParent() + " " + wall.getBoundsInParent() + " " + rock.getBoundsInParent());
        System.out.println("overlap: " + (Shape.intersect(ship, rock).getBoundsInLocal().getWidth() != -1) + " " + (Shape.intersect(rock, centered).getBoundsInLocal().getWidth() != -1));

        Text moved = new Text("in a VBox");
        moved.setTranslateX(7);
        moved.setRotate(10);
        VBox box = new VBox(new HBox(new Text("left"), new Rectangle(10, 10)), moved);
        box.setLayoutX(20);
        box.setLayoutY(170);
        pane.getChildren().add(box);

        Scene scene = new Scene(pane);
        scene.setOnKeyPressed(e -> {
            log("pressed " + e.getCode() + " \"" + e.getText() + "\" " + e.getEventType());
            Platform.runLater(() -> log("a task the press of " + e.getCode() + " queued"));
            if (e.getCode() == KeyCode.L) {
                late.start();
            }
            if (e.getCode() == KeyCode.Q) {
                b.stop();
            }
        });
        scene.setOnKeyTyped(e -> log("typed \"" + e.getCharacter() + "\" " + e.getCode()));
        scene.setOnKeyReleased(e -> log("released " + e.getCode() + " \"" + e.getText() + "\""));
        a = new AnimationTimer() {
            @Override
            public void handle(long now) {
                frame++;
                log("a " + frame);
                ship.setTranslateX(ship.getTranslateX() + 2);
                ship.setRotate(ship.getRotate() + 15);
                text.setText("Points: " + frame);
                if (frame == 2) {
                    // Stopped and started again: from now on after b.
                    stop();
                    start();
                }
                if (frame == 3) {
                    pane.getChildren().remove(colored);
                    pane.getChildren().add(new Circle(5));
                }
            }
        };
        b = new AnimationTimer() {
            @Override
            public void handle(long now) {
                log("b " + frame);
                if (frame == 4) {
                    throw new IllegalStateException("b fails in frame 4");
                }
            }
        };
        late = new AnimationTimer() {
            @Override
            public void handle(long now) {
                log("late " + frame);
                Point2D p = new Point2D(ship.getTranslateX(), ship.getTranslateY());
                if (p.getX() > 140) {
                    log("the ship is at " + p + ": exit");
                    Platform.exit();
                }
            }
        };
        a.start();
        b.start();
        a.start();
        stage.setScene(scene);
        stage.setTitle("Game");
        stage.show();
    }

    void log(String s) {
        System.out.println(s);
    }

    @Override
    public void stop() {
        System.out.println("stop after frame " + frame);
    }

    public static void main(String[] args) {
        launch(args);
    }
}
