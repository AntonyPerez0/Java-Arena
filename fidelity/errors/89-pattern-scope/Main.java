public class Main {
    static int length(Object value) {
        if (value instanceof String text) {
            System.out.println("text: " + text);
        }
        return text.length();
    }

    static int twice(Object value) {
        if (!(value instanceof Integer number)) {
            System.out.println("not a number: " + number);
        }
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(length("abc") + twice(4));
    }
}
