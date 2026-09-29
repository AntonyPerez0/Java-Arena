public class Main {
    static int grade(int points) {
        if (points < 0 || points > 100) {
            throw new IllegalArgumentException("Points must be 0 to 100, got " + points);
        }
        return points / 20;
    }

    static void report(int[] points) {
        for (int p : points) {
            System.out.println(p + " -> " + grade(p));
        }
    }

    public static void main(String[] args) {
        System.out.println("Grading...");
        report(new int[] {95, 40, 120, 70});
        System.out.println("never printed");
    }
}
