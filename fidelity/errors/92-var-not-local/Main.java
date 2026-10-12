public class Main {
    private var count = 0;

    static var twice(int x) {
        return x * 2;
    }

    static int half(var x) {
        return x / 2;
    }

    public static void main(String[] args) {
        var a = 1, b = 2;
        System.out.println(a + b);
    }
}
