public class Utf8Cap {
    public static void main(String[] args) {
        System.out.print("x");
        String line = "ä".repeat(100);
        for (int i = 0; i < 400; i++) {
            System.out.println(line);
        }
    }
}
