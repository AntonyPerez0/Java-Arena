public class Main {
    private int counter = 0;

    void increment() {
        counter++;
    }

    public static void main(String[] args) {
        increment();
        System.out.println(counter);
    }
}
