public class Main {
    public static void main(String[] args) {
        float f1 = 16777217f;
        System.out.println(f1);
        System.out.println(1.4E-45f);
        System.out.println(1.17549435E-38f);
        System.out.println(0.1f);
        System.out.println(1.1f * 1.1f);
        System.out.println((float) 1 / 3);
        System.out.println(3.4028235E38f);
        System.out.println(Float.MIN_NORMAL + " " + Float.MIN_VALUE + " " + Float.MAX_VALUE);
        System.out.println(0.1f + 0.2f);
        System.out.println((double) 0.1f);
        System.out.println(Float.parseFloat("3.14159265358979"));
        float sum = 0f;
        for (int i = 0; i < 100; i++) {
            sum += 0.01f;
        }
        System.out.println(sum);
        System.out.println("folded " + 1.1f + " " + 16777217f);
    }
}
