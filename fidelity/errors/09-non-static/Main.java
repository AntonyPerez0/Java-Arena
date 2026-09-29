public class Main {
    int count = 0;

    void increase() {
        count++;
    }

    public static void main(String[] args) {
        increase();
        System.out.println(count);
    }
}
