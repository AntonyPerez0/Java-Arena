public class Main {
    public static int half(int value) {
        if (value % 2 != 0) {
            throw new IllegalArgumentException("Odd value: " + value);
            System.out.println("This never prints");
        }
        return value / 2;
    }

    public static void main(String[] args) {
        System.out.println(half(8));
    }
}
