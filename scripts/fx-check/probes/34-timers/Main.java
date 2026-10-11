import java.util.ArrayList;
import java.util.List;
import javafx.animation.AnimationTimer;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Polygon;
import javafx.scene.text.Text;
import javafx.stage.Stage;

/**
 * AnimationTimer: timers run in the order they were started, once per frame and only while frames
 * run; a timer started twice; a timer that starts another one inside handle (it runs from the
 * next frame); one that stops a later timer (which still runs in that frame) and one that stops an
 * earlier one; a timer that stops itself; stop() on a timer never started; timers started and
 * stopped from key handlers and from a runLater task; the made-up now (the same on both sides
 * here: lessons never print it); shapes moved, turned, added and removed and a Text changed while
 * frames run; frames lines that can't be read.
 */
public class Main extends Application {
    int frame;
    long first = -1;
    final List<AnimationTimer> timers = new ArrayList<>();

    static void p(String s) {
        System.out.println(s);
    }

    AnimationTimer timer(String name, Runnable body) {
        return new AnimationTimer() {
            @Override
            public void handle(long now) {
                if (first < 0) {
                    first = now;
                }
                p(name + " in frame " + frame + ", now - first = " + (now - first));
                body.run();
            }

            @Override
            public String toString() {
                return name;
            }
        };
    }

    @Override
    public void start(Stage stage) {
        Pane pane = new Pane();
        pane.setPrefSize(300, 200);
        Polygon ship = new Polygon(-6, -4, 8, 0, -6, 4);
        ship.setTranslateX(150);
        ship.setTranslateY(100);
        Text frames = new Text(10, 20, "frame 0");
        pane.getChildren().addAll(ship, frames);
        AnimationTimer[] t = new AnimationTimer[8];
        // counter: counts frames; first started, so it runs first.
        t[0] = timer("counter", () -> {
            frame++;
            frames.setText("frame " + frame);
        });
        t[1] = timer("mover", () -> {
            ship.setTranslateX(ship.getTranslateX() + 1.5);
            ship.setRotate(ship.getRotate() + 7.5);
            if (frame == 3) {
                p("mover starts spawner");
                t[3].start();
            }
            if (frame == 5) {
                p("mover stops checker, which comes later");
                t[2].stop();
            }
            if (frame == 6) {
                p("mover stops counter, which came earlier");
                t[0].stop();
            }
        });
        t[2] = timer("checker", () -> p("checker sees frame " + frame));
        t[3] = timer("spawner", () -> {
            Circle rock = new Circle(5 * frame, 50, 4);
            pane.getChildren().add(rock);
            if (pane.getChildren().size() > 5) {
                pane.getChildren().remove(2);
            }
            if (frame >= 5) {
                p("spawner stops itself");
                t[3].stop();
            }
        });
        t[4] = timer("never started", () -> p("never"));
        t[4].stop();
        t[0].start();
        t[1].start();
        t[0].start();
        t[2].start();
        Scene scene = new Scene(pane);
        scene.setOnKeyPressed(e -> {
            p("pressed " + e.getCode() + " in frame " + frame);
            if (e.getCode() == KeyCode.S) {
                t[0].stop();
                t[1].stop();
            }
            if (e.getCode() == KeyCode.G) {
                // Started again: counter after mover now.
                t[1].start();
                t[0].start();
                t[2].start();
            }
            if (e.getCode() == KeyCode.L) {
                Platform.runLater(() -> {
                    p("a task starts late");
                    timer("late", () -> {
                    }).start();
                });
            }
        });
        stage.setScene(scene);
        stage.show();
        p("shown; frame " + frame);
    }

    @Override
    public void stop() {
        p("stop: " + frame + " frames counted");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
