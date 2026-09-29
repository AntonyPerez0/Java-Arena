public class OomUncaught {
    public static void main(String[] args) {
        System.out.println("start");
        long[] huge = new long[1_000_000_000];
        System.out.println("never printed " + huge.length);
    }
}
