import java.util.Locale;

public class Formats {
    public static void main(String[] args) {
        System.out.printf("%.2f%n", 3.14159);
        System.out.printf("%.2f %.2f %.2f %.2f%n", 2.675, 1.005, 0.125, 0.135);
        System.out.printf("[%5d] [%-5d] [%05d]%n", 42, 42, 42);
        System.out.printf("[%-8s] [%8s] [%s]%n", "left", "right", null);
        System.out.printf("%,d %,d %,.3f%n", 1234567, -9876543210L, 1234567.891);
        System.out.printf("%e %E %.3e%n", 12345.678, 0.000123, 6.02214076e23);
        System.out.printf("%08.3f|%+.1f|% d%n", 3.14159, 2.0, 5);
        System.out.printf("%.0f %.0f %.0f %.0f%n", 2.5, 3.5, 0.5, -2.5);
        System.out.printf("%.1f %.1f %.1f%n", 1.05, 1.15, 0.25);
        System.out.printf("%x %X %o %c %b %%%n", 255, 255, 8, 'x', true);
        System.out.printf("%10.4f|%-10.2f|%n", Math.PI, Math.E);
        System.out.printf("%s %S %h%n", "text", "text", "hi");
        System.out.println(String.format("%3$s %1$s %2$s", "a", "b", "c"));
        System.out.println(String.format("%.3f", 1.0 / 3) + " " + String.format("%6.2f%%", 45.678));
        System.out.println(String.format("%d items at %.2f each = %.2f", 3, 19.99, 3 * 19.99));
        System.out.println(String.format("%g %g", 0.0001234, 123456789.0));
        System.out.println(String.format(Locale.ROOT, "%,.2f", 1234.5));
        System.out.println(String.format("%tY-%<tm-%<td", java.time.LocalDate.of(2024, 2, 29)));
        System.out.println("x".repeat(3) + String.join(",", "a", "b") + " " + "  trim  ".strip() + "|");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5; i++) sb.append(i).append(' ');
        System.out.println(sb.reverse());
        System.out.println(String.valueOf(new char[] {'o', 'k'}) + " " + "Hello".chars().sum() + " " + "abc".compareTo("abd"));
    }
}
