public class Main {
    public static int sum(int[] values) {
        int total = 0;
        for (int i = 0; i <= values.length; i++) {
            total += values[i];
        }
        return total;
    }

    public static void main(String[] args) {
        int[] scores = {3, 5, 7};
        System.out.println("Adding up...");
        System.out.println(sum(scores));
    }
}
