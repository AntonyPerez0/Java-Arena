public class Main {
    static {
        System.out.println("static initializer must not run");
    }

    public static void mian(String[] args) {
        System.out.println("never printed");
    }
}
