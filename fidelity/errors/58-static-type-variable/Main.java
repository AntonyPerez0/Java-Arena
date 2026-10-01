public class Main {
    public static void main(String[] args) {
        OwnList<String> names = new OwnList<>();
    }
}

class OwnList<T> {
    private static T latest;
    private T[] values;

    public static T first() {
        return null;
    }

    public static void print(T value) {
        System.out.println(value);
    }

    public static int count() {
        T value = null;
        return 0;
    }
}
