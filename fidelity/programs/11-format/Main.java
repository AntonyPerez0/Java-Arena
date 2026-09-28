public class Main {
    public static void main(String[] args) {
        System.out.printf("%.2f%n", 3.14159);
        System.out.printf("[%5d] [%-5d] [%05d]%n", 42, 42, 42);
        System.out.printf("[%-8s] [%8s]%n", "left", "right");
        System.out.printf("%,d %,d%n", 1234567, -9876543210L);
        System.out.printf("%e %.3e %E%n", 12345.678, 0.000123, 6.02e23);
        System.out.printf("%08.3f %+.1f %(.2f%n", 3.14159, 2.0, -5.5);
        System.out.printf("%.0f %.0f %.0f %.0f%n", 0.5, 1.5, 2.5, 3.5);
        System.out.printf("%.1f %.1f %.2f %.2f%n", 1.05, 1.15, 2.675, 1.005);
        System.out.printf("%x %X %o %c %b %%%n", 255, 255, 8, 'J', true);
        System.out.printf("%s %S %10.3s|%n", "java", "java", "arena");
        System.out.printf("%d%% done, %s items%n", 75, 12);
        String s = String.format("%-10s|%6.2f|%3d", "Coffee", 2.5, 7);
        System.out.println(s);
        System.out.println(String.format("%.3f", 1.0 / 3) + " " + String.format("%10.4f", Math.PI));
        System.out.println(String.format("%,.2f", 1234567.891));
        System.out.printf("%2$s %1$s%n", "world", "hello");
        System.out.printf("%g %g%n", 0.0001234, 123456789.0);
        System.out.println(String.format("%.2f", Double.NaN) + " " + String.format("%.2f", Double.POSITIVE_INFINITY));
    }
}
