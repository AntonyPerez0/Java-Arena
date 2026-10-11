import java.util.Random;
import javafx.geometry.Point2D;
import javafx.scene.paint.Color;
import javafx.scene.shape.Polygon;

/** A rock: a polygon of five corners at random distances, turning as it moves. */
public class Asteroid extends Character {
    private final double rotationalMovement;

    public Asteroid(Random random, int x, int y) {
        super(rock(random), x, y);
        getShape().setFill(Color.GRAY);
        getShape().setRotate(random.nextInt(360));
        int speed = 1 + random.nextInt(10);
        for (int i = 0; i < speed; i++) {
            accelerate();
        }
        rotationalMovement = 0.5 - random.nextDouble();
    }

    private static Polygon rock(Random random) {
        double size = 10 + random.nextInt(10);
        Polygon polygon = new Polygon();
        double c1 = Math.cos(Math.PI * 2 / 5);
        double c2 = Math.cos(Math.PI / 5);
        double s1 = Math.sin(Math.PI * 2 / 5);
        double s2 = Math.sin(Math.PI * 4 / 5);
        polygon.getPoints().addAll(size, 0.0, size * c1, -1 * size * s1, -1 * size * c2, -1 * size * s2, -1 * size * c2, size * s2, size * c1, size * s1);
        for (int i = 0; i < polygon.getPoints().size(); i++) {
            int change = random.nextInt(5) - 2;
            polygon.getPoints().set(i, polygon.getPoints().get(i) + change);
        }
        return polygon;
    }

    @Override
    public void move() {
        super.move();
        getShape().setRotate(getShape().getRotate() + rotationalMovement);
    }

    /** Where it is, rounded for printing. */
    public Point2D where() {
        return new Point2D(Math.round(getShape().getTranslateX()), Math.round(getShape().getTranslateY()));
    }
}
