public class Main {
    static class Settings {
        static final int LEVEL;

        static {
            System.out.println("Reading settings");
            System.exit(6);
            LEVEL = 1;
        }
    }

    public static void main(String[] args) {
        System.out.println("Starting");
        System.out.println("Level " + Settings.LEVEL);
    }
}
