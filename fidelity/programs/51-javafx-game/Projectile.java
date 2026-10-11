import javafx.scene.shape.Circle;

/** A shot: a small circle that flies straight on for a while. */
public class Projectile extends Character {
    private int age;

    public Projectile(double x, double y) {
        super(new Circle(2), x, y);
    }

    public boolean tooOld() {
        age++;
        return age > 70;
    }
}
