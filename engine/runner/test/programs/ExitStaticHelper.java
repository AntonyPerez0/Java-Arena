public class ExitStaticHelper {
    static class Config {
        static int value = 1;

        static {
            System.out.println("config initializer");
            System.exit(6);
        }
    }

    public static void main(String[] args) {
        System.out.println("main");
        System.out.println(Config.value);
        System.out.println("after must not print");
    }
}
