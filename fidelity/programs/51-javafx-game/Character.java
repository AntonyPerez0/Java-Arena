import javafx.geometry.Point2D;
import javafx.scene.shape.Shape;

/** Something that moves in the game: a shape, and how far it moves each frame. */
public abstract class Character {
    private final Shape shape;
    private Point2D movement;
    private boolean alive;

    public Character(Shape shape, double x, double y) {
        this.shape = shape;
        this.shape.setTranslateX(x);
        this.shape.setTranslateY(y);
        this.movement = new Point2D(0, 0);
        this.alive = true;
    }

    public Shape getShape() {
        return shape;
    }

    public Point2D getMovement() {
        return movement;
    }

    public void setMovement(Point2D movement) {
        this.movement = movement;
    }

    public boolean isAlive() {
        return alive;
    }

    public void setAlive(boolean alive) {
        this.alive = alive;
    }

    public void turnLeft() {
        shape.setRotate(shape.getRotate() - 5);
    }

    public void turnRight() {
        shape.setRotate(shape.getRotate() + 5);
    }

    /** Moves by the movement, coming back on the other side at the window's edges. */
    public void move() {
        shape.setTranslateX(shape.getTranslateX() + movement.getX());
        shape.setTranslateY(shape.getTranslateY() + movement.getY());
        if (shape.getTranslateX() < 0) {
            shape.setTranslateX(shape.getTranslateX() + Main.WIDTH);
        }
        if (shape.getTranslateX() > Main.WIDTH) {
            shape.setTranslateX(shape.getTranslateX() % Main.WIDTH);
        }
        if (shape.getTranslateY() < 0) {
            shape.setTranslateY(shape.getTranslateY() + Main.HEIGHT);
        }
        if (shape.getTranslateY() > Main.HEIGHT) {
            shape.setTranslateY(shape.getTranslateY() % Main.HEIGHT);
        }
    }

    public void accelerate() {
        double changeX = Math.cos(Math.toRadians(shape.getRotate()));
        double changeY = Math.sin(Math.toRadians(shape.getRotate()));
        movement = movement.add(changeX * 0.05, changeY * 0.05);
    }

    public boolean collide(Character other) {
        Shape collisionArea = Shape.intersect(shape, other.getShape());
        return collisionArea.getBoundsInLocal().getWidth() != -1;
    }
}
