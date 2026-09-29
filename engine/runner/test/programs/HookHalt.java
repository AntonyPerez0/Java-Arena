public class HookHalt {
    public static void main(String[] args) {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("hook");
            Runtime.getRuntime().halt(9);
        }));
        System.out.println("main");
        System.exit(3);
    }
}
