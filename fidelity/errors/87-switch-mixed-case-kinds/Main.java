public class Main {
    public static void main(String[] args) {
        int size = 2;
        switch (size) {
            case 1 -> System.out.println("small");
            case 2:
                System.out.println("big");
                break;
            default -> System.out.println("huge");
        }
        String day = "sat";
        switch (day) {
            case "sat":
                System.out.println("weekend");
                break;
            case "mon" -> System.out.println("work");
            default:
                System.out.println("other");
        }
    }
}
