public class BigOutput {
    public static void main(String[] args) {
        for (int i = 0; i < 20000; i++) {
            System.out.println("line " + i);
        }
        System.err.println("not reached in the browser");
    }
}
