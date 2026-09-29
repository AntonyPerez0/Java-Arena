public class ExitStaticMain {
    static {
        System.out.println("static initializer");
        System.exit(5);
    }

    public static void main(String[] args) {
        System.out.println("main must not run");
    }
}
