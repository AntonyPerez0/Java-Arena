public class Main {
    final int limit = 3;

    abstract static class Shape {
        abstract double area();
    }

    static class Square extends Shape {
    }

    Main() {
        System.out.println("ctor");
        super();
    }

    public static void main(String[] args) {
        break;
        Shape s = new Shape();
        Main m = new Main();
        m.limit = 4;
        var nothing;
        var n = null;
    }
}
