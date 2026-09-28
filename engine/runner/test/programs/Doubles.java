public class Doubles {
    public static void main(String[] args) {
        double[] values = {0.1 + 0.2, 1.0 / 3, 2.0 / 3, 100.0, 1e7, 1e-3, 1.0E-4, 12345678.9, 1e21, 1e22, 1e23, 2e23,
            Double.MIN_VALUE, Double.MAX_VALUE, Double.MIN_NORMAL, -0.0, 0.0 / 0.0, 1.0 / 0.0, -1.0 / 0.0,
            4.35 * 100, 1.1 * 1.1, 0.1 * 3, 9007199254740993.0, 123456789012.345, 5e-324, 2.2250738585072014E-308};
        for (double v : values) System.out.println(v);
        float[] floats = {0.1f, 1.0f / 3, 16777216f, 3.4028235e38f, Float.MIN_VALUE, 1.1f * 1.1f, 100f / 7};
        for (float f : floats) System.out.println(f);
        System.out.println((float) 0.1 + " " + (double) 0.1f + " " + (int) 3.99 + " " + (int) -3.99 + " " + (long) 1e19);
        System.out.println(Math.round(2.5) + " " + Math.round(-2.5) + " " + Math.round(0.49999999999999994) + " " + Math.rint(2.5));
        System.out.println(Math.sqrt(2) + " " + Math.pow(2, 0.5) + " " + Math.abs(-7.5) + " " + Math.floor(-1.5) + " " + Math.ceil(-1.5));
        System.out.println(Double.parseDouble("1e-5") + " " + Double.valueOf("3.0") + " " + Double.compare(0.0, -0.0));
        System.out.println(Integer.MAX_VALUE + 1);
        System.out.println(Long.MAX_VALUE + " " + Long.MIN_VALUE + " " + (byte) 200 + " " + (char) 65 + " " + (short) 70000);
        System.out.println(10 / 3 + " " + 10 % 3 + " " + -10 / 3 + " " + -10 % 3 + " " + 10.0 / 3 + " " + 7 / 2.0);
        System.out.println(Integer.toBinaryString(42) + " " + Integer.toHexString(-1) + " " + Long.toString(255, 16) + " " + Integer.parseInt("-123"));
        System.out.println(Double.toString(1234567.0) + " " + String.valueOf(1.0e-10) + " " + Float.toString(1.0e10f));
    }
}
