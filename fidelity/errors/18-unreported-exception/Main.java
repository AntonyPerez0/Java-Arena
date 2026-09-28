public class Main {
    static void check(int value) {
        if (value < 0) {
            throw new Exception("negative");
        }
    }

    public static void main(String[] args) {
        check(-1);
        Thread.sleep(10);
    }
}
