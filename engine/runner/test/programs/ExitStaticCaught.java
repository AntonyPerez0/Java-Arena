public class ExitStaticCaught {
    static class Config {
        static int value = 1;

        static {
            System.out.println("config initializer");
            System.exit(6);
        }
    }

    public static void main(String[] args) {
        System.out.println("main");
        try {
            System.out.println(Config.value);
        } catch (Throwable t) {
            System.out.println("caught " + t);
        }
        System.out.println("after must not print");
    }
}
