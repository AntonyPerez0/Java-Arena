public class Main {
    public static void main(String[] args) {
        System.out.println(0.1 + 0.2);
        System.out.println(1.0 / 3);
        System.out.println(100.0 / 7);
        System.out.println(2.0 / 3 * 3);
        int a = 7;
        int b = 2;
        System.out.println(a / b);
        System.out.println((double) a / b);
        System.out.println((double) (a / b));
        System.out.println(1.0 * a / b);
        double average = (4 + 5 + 4) / 3.0;
        System.out.println("Average: " + average);
        System.out.println(19.99 * 3);
        System.out.println(1.1 * 1.1);
        System.out.println(3.0);
        System.out.println(-0.5 * 4);
        System.out.println(1e3 + " " + 12.0e2 + " " + 0.000125);
        double total = 0;
        for (int i = 0; i < 10; i++) {
            total += 0.1;
        }
        System.out.println(total);
        System.out.println((int) 3.99 + " " + (int) -3.99 + " " + Math.round(3.5) + " " + Math.round(-3.5));
    }
}
