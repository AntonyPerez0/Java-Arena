public class Main {
    public static void main(String[] args) {
        int day = 3;
        String name = switch (day) {
            case 1 -> "Monday";
            case 2 -> {
                System.out.println("a Tuesday");
                "Tuesday";
            }
            default -> "other";
        };
        System.out.println(name);
    }
}
