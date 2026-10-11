import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;
import javafx.animation.AnimationTimer;
import javafx.application.Application;
import javafx.geometry.Bounds;
import javafx.geometry.Point2D;
import javafx.scene.Scene;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.scene.text.Text;
import javafx.stage.Stage;

/**
 * A small game in the style of the MOOC's asteroids (part 14.3): a ship turned and pushed with the
 * arrow keys, shots fired with Space, rocks that turn and wrap at the edges, collisions with
 * Shape.intersect, points in a Text, and a second timer that brings new rocks.
 */
public class Main extends Application {
    public static final int WIDTH = 600;
    public static final int HEIGHT = 400;

    private final Random random = new Random(1914);
    private final Map<KeyCode, Boolean> pressed = new HashMap<>();
    private final List<Asteroid> asteroids = new ArrayList<>();
    private final List<Projectile> projectiles = new ArrayList<>();
    private Pane pane;
    private Ship ship;
    private Text text;
    private int points;
    private int frame;
    private int lastShot = -100;
    private int spawned;
    private AnimationTimer spawner;

    @Override
    public void start(Stage stage) {
        checkGeometry();
        pane = new Pane();
        pane.setPrefSize(WIDTH, HEIGHT);
        text = new Text(10, 20, "Points: 0");
        pane.getChildren().add(text);
        ship = new Ship(WIDTH / 2, HEIGHT / 2);
        pane.getChildren().add(ship.getShape());
        for (int i = 0; i < 5; i++) {
            Asteroid a = new Asteroid(random, random.nextInt(WIDTH / 3), random.nextInt(HEIGHT));
            asteroids.add(a);
            pane.getChildren().add(a.getShape());
        }
        // One rock right in the ship's way.
        Asteroid inTheWay = new Asteroid(random, WIDTH / 2 + 70, HEIGHT / 2 + 3);
        asteroids.add(inTheWay);
        pane.getChildren().add(inTheWay.getShape());
        System.out.println("rocks at " + asteroids.stream().map(a -> a.where().toString()).collect(Collectors.joining(", ")));

        Scene scene = new Scene(pane);
        scene.setOnKeyPressed(event -> {
            KeyCode code = event.getCode();
            System.out.println("frame " + frame + ": pressed " + code + " (" + code.getName() + ", text \"" + event.getText() + "\", arrow " + code.isArrowKey() + ", letter " + code.isLetterKey() + ")");
            pressed.put(code, Boolean.TRUE);
            if (code == KeyCode.SPACE) {
                fire();
            }
            if (code == KeyCode.A) {
                System.out.println("spawner started again");
                spawner.start();
            }
        });
        scene.setOnKeyReleased(event -> {
            System.out.println("frame " + frame + ": released " + event.getCode() + ", " + event.getEventType());
            pressed.put(event.getCode(), Boolean.FALSE);
        });
        scene.setOnKeyTyped(event -> System.out.println("frame " + frame + ": typed '" + event.getCharacter() + "', code " + event.getCode() + ", text \"" + event.getText() + "\""));

        new AnimationTimer() {
            @Override
            public void handle(long now) {
                frame++;
                if (pressed.getOrDefault(KeyCode.LEFT, false)) {
                    ship.turnLeft();
                }
                if (pressed.getOrDefault(KeyCode.RIGHT, false)) {
                    ship.turnRight();
                }
                if (pressed.getOrDefault(KeyCode.UP, false)) {
                    ship.accelerate();
                }
                if (pressed.getOrDefault(KeyCode.SPACE, false) && frame - lastShot >= 15) {
                    fire();
                }
                ship.move();
                asteroids.forEach(Asteroid::move);
                projectiles.forEach(Projectile::move);
                for (Projectile p : projectiles) {
                    for (Asteroid a : asteroids) {
                        if (a.isAlive() && p.isAlive() && p.collide(a)) {
                            p.setAlive(false);
                            a.setAlive(false);
                            points += 10;
                            text.setText("Points: " + points);
                            System.out.println("frame " + frame + ": a shot hit the rock at " + a.where() + ", points " + points);
                        }
                    }
                    if (p.isAlive() && p.tooOld()) {
                        p.setAlive(false);
                    }
                }
                for (Asteroid a : asteroids) {
                    if (a.isAlive() && a.collide(ship)) {
                        System.out.println("frame " + frame + ": the ship hit the rock at " + a.where());
                        ship.getShape().setFill(Color.CRIMSON);
                        a.setAlive(false);
                    }
                }
                removeTheDead();
            }
        }.start();

        spawner = new AnimationTimer() {
            private int frames;

            @Override
            public void handle(long now) {
                frames++;
                if (frames % 40 == 0) {
                    Asteroid a = new Asteroid(random, WIDTH, random.nextInt(HEIGHT));
                    asteroids.add(a);
                    pane.getChildren().add(a.getShape());
                    spawned++;
                    System.out.println("frame " + frame + ": a new rock at " + a.where());
                    if (spawned % 3 == 0) {
                        System.out.println("spawner stops after " + spawned + " rocks");
                        stop();
                    }
                }
            }
        };
        spawner.start();
        spawner.start();

        stage.setTitle("Asteroids");
        stage.setScene(scene);
        stage.show();
        System.out.println("scene " + scene.getWidth() + " x " + scene.getHeight());
    }

    private void fire() {
        if (projectiles.size() >= 3) {
            return;
        }
        lastShot = frame;
        Shape s = ship.getShape();
        Projectile p = new Projectile(s.getTranslateX(), s.getTranslateY());
        double angle = Math.toRadians(s.getRotate());
        p.setMovement(new Point2D(Math.cos(angle), Math.sin(angle)).normalize().multiply(3).add(ship.getMovement()));
        projectiles.add(p);
        pane.getChildren().add(p.getShape());
    }

    private void removeTheDead() {
        projectiles.stream().filter(p -> !p.isAlive()).forEach(p -> pane.getChildren().remove(p.getShape()));
        projectiles.removeIf(p -> !p.isAlive());
        asteroids.stream().filter(a -> !a.isAlive()).forEach(a -> pane.getChildren().remove(a.getShape()));
        asteroids.removeIf(a -> !a.isAlive());
    }

    @Override
    public void stop() {
        Shape s = ship.getShape();
        System.out.println("after " + frame + " frames: " + points + " points, " + asteroids.size() + " rocks, " + projectiles.size() + " shots, " + pane.getChildren().size() + " nodes in the pane");
        System.out.println("ship at (" + s.getTranslateX() + ", " + s.getTranslateY() + "), turned " + s.getRotate() + ", moving " + ship.getMovement() + ", speed " + ship.getMovement().magnitude());
        System.out.println("ship bounds " + s.getBoundsInParent());
    }

    /** Point2D's formulas, shape bounds and intersect in the cases a game meets. */
    private static void checkGeometry() {
        Point2D a = new Point2D(3, 4);
        Point2D b = new Point2D(-1.5, 2);
        System.out.println(a + " " + a.magnitude() + " " + a.normalize() + " " + a.add(b) + " " + a.subtract(b) + " " + a.multiply(0.1) + " " + a.distance(b) + " " + a.angle(b) + " " + a.dotProduct(b) + " " + a.midpoint(b) + " " + Point2D.ZERO.normalize() + " " + a.equals(new Point2D(3.0, 4.0)) + " " + a.hashCode());
        Point2D heading = new Point2D(0, 0);
        for (int i = 0; i < 600; i++) {
            double r = Math.toRadians(i * 1.75);
            heading = heading.add(Math.cos(r) * 0.05, Math.sin(r) * 0.05);
        }
        System.out.println("after 600 turns and pushes: " + heading + " " + heading.magnitude());

        Polygon one = new Polygon(-5, -5, 10, 0, -5, 5);
        one.setTranslateX(100.5);
        one.setTranslateY(50.25);
        one.setRotate(33.3);
        System.out.println("ship shape: local " + one.getBoundsInLocal() + ", parent " + one.getBoundsInParent());
        Polygon square = new Polygon(0, 0, 10, 0, 10, 10, 0, 10);
        Polygon next = new Polygon(0, 0, 10, 0, 10, 10, 0, 10);
        next.setLayoutX(10);
        report("squares side by side (touching)", square, next);
        next.setLayoutX(9.5);
        report("squares overlapping by half a pixel", square, next);
        next.setLayoutX(10);
        next.setTranslateY(10);
        report("squares corner to corner", square, next);
        Polygon turned = new Polygon(0, 0, 10, 0, 10, 10, 0, 10);
        turned.setRotate(45);
        turned.setTranslateX(13.5);
        report("a square turned 45 degrees, its corner near", square, turned);
        turned.setTranslateX(12);
        report("a square turned 45 degrees, its corner in", square, turned);
        Polygon inside = new Polygon(2, 2, 4, 2, 4, 4);
        report("a triangle inside a square", square, inside);
        Circle shot = new Circle(2);
        shot.setTranslateX(12);
        shot.setTranslateY(5);
        System.out.println("a shot next to a square overlaps: " + overlaps(square, shot));
        shot.setTranslateX(11.9);
        System.out.println("a shot touching a square by 0.1 overlaps: " + overlaps(square, shot));
        Circle other = new Circle(4, 5, 2);
        System.out.println("two circles touching overlap: " + overlaps(shot, new Circle(15.9, 5, 2)) + ", one apart: " + overlaps(shot, new Circle(16.9, 5, 2)) + ", overlapping: " + overlaps(shot, new Circle(15, 5, 2)) + ", " + overlaps(other, square));
        Rectangle wall = new Rectangle(20, 0, 5, 30);
        wall.setRotate(90);
        report("a wall turned 90 degrees and a square", wall, square);
        System.out.println("keys: " + KeyCode.getKeyCode("Left") + " " + KeyCode.getKeyCode("LEFT") + " " + KeyCode.DIGIT1.getName() + " " + KeyCode.DIGIT1.isDigitKey() + " " + KeyCode.SPACE.isWhitespaceKey() + " " + KeyCode.values().length + " " + KeyEvent.KEY_TYPED);
    }

    private static boolean overlaps(Shape a, Shape b) {
        return Shape.intersect(a, b).getBoundsInLocal().getWidth() != -1;
    }

    private static void report(String what, Shape a, Shape b) {
        Bounds area = Shape.intersect(a, b).getBoundsInLocal();
        System.out.println(what + ": " + (area.getWidth() != -1) + " " + area);
    }

    public static void main(String[] args) {
        launch(args);
    }
}
