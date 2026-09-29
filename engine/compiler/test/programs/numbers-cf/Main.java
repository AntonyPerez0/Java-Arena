public class Main {
    static final double D = 1e23;
    public static void main(String[] a) {
        System.out.println("c1 " + 1e23);
        System.out.println("c2 " + 2e23);
        System.out.println("c3 " + 0.1f);
        System.out.println("c4 " + (0.1 + 0.2));
        System.out.println("c5 " + D);
        System.out.println("c6 " + 1.0 / 3);
        System.out.println("c7 " + 100.0 / 7);
        System.out.println("c8 " + (float) 0.1);
        System.out.println("c9 " + 1e-5 + " " + 0.001 + " " + 1e7 + " " + 123456789.0);
        System.out.println("c10 " + Math.PI + " " + Math.E);
        System.out.println("c11 " + 4.35 * 100 + " " + 1.1 * 1.1 + " " + 2.0 / 3 * 3);
        System.out.println("c12 " + Double.MAX_VALUE + " " + Float.MAX_VALUE + " " + Long.MIN_VALUE);
        System.out.println("c13 " + 5e-324 + " " + 1e22 + " " + 9.999999999999999e22);
        double x = 1e23;
        System.out.println("r1 " + x);
        System.out.println("b1 " + Double.doubleToRawLongBits(9007199254740993.0));
        System.out.println("b2 " + Double.doubleToRawLongBits(2.2250738585072014E-308));
        System.out.println("b3 " + Double.doubleToRawLongBits(1.00000000000000011102230246251565404236316680908203125));
        System.out.println("b4 " + Double.doubleToRawLongBits(0.1) + " " + Double.doubleToRawLongBits(123.456) + " " + Double.doubleToRawLongBits(3.141592653589793));
        System.out.println("b5 " + Float.floatToRawIntBits(16777217f) + " " + Float.floatToRawIntBits(0.1f) + " " + Float.floatToRawIntBits(3.4028235e38f));
        System.out.println("b6 " + Double.doubleToRawLongBits(1.7976931348623157E308));
        System.out.println("b7 " + Double.doubleToRawLongBits(0x1.fffffffffffffp-1) + " " + Double.doubleToRawLongBits(1e-300 * 1e-10));
    }
}
