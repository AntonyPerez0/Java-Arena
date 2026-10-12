public class Main {
    record Counter(String name) {
        int count;

        void add() {
            count++;
        }
    }

    public static void main(String[] args) {
        Counter c = new Counter("clicks");
        c.add();
    }
}
