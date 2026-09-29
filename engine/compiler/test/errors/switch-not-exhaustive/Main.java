public class Main {
    enum Color { RED, GREEN, BLUE }
    sealed interface Pet permits Dog, Cat {}
    record Dog() implements Pet {}
    record Cat() implements Pet {}

    public static void main(String[] args) {
        Color c = Color.RED;
        String name = switch (c) {
            case RED -> "red";
            case GREEN -> "green";
        };
        Pet p = new Dog();
        int legs = switch (p) {
            case Dog d -> 4;
        };
        int x = switch (args.length) {
            case 0 -> 1;
            case 0 -> 2;
            default -> 3;
        };
    }
}
