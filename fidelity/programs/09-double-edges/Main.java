public class Main {
    public static void main(String[] args) {
        double[] values = {1e7, 9999999.0, 1.0E-3, 0.001, 1.0E-4, 1e23, 2e23, 1e22, 1.0E21,
                Double.MIN_VALUE, Double.MAX_VALUE, Double.MIN_NORMAL, 4.35, 2.675, 1234567.0,
                12345678.9, 0.30000000000000004, 123456789012345678.0, 5e-324, 1.7976931348623157E308};
        for (double v : values) {
            System.out.println(v);
        }
        System.out.println(0.0 / 0.0);
        System.out.println(1.0 / 0.0);
        System.out.println(-1.0 / 0.0);
        System.out.println(-0.0);
        System.out.println(0.0 == -0.0);
        System.out.println(Double.compare(0.0, -0.0));
        System.out.println(Double.valueOf("1e23") + " " + Double.parseDouble("  2.5  ") + " " + Double.valueOf("0x1.8p1"));
        System.out.println(Double.toString(100) + " " + String.valueOf(1e-5));
        System.out.println("folded " + 1e23 + " " + 5e-324 + " " + 9.999999999999999e22);
        System.out.println(0x1.fffffffffffffp-1);
    }
}
