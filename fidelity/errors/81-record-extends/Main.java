class Shape {
}

record Circle(double radius) extends Shape {
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new Circle(1.0));
    }
}
