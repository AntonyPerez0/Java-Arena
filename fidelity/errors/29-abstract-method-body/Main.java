public class Main {
    public static void main(String[] args) {
        System.out.println(new Circle(2).area());
    }
}

abstract class Shape {
    public abstract double area() {
        return 0;
    }

    public void describe();
}

class Circle extends Shape {
    private double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    public double area() {
        return Math.PI * this.radius * this.radius;
    }
}

interface Drawable {
    void draw() {
        System.out.println("drawing");
    }
}
