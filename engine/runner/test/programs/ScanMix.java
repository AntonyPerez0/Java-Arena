import java.util.Scanner;

public class ScanMix {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int a = scanner.nextInt();
        int b = scanner.nextInt();
        System.out.println("sum " + (a + b));
        scanner.nextLine();
        String name = scanner.nextLine();
        System.out.println("name [" + name + "] length " + name.length());
        double d = scanner.nextDouble();
        System.out.println("double " + d + " times 3 = " + d * 3);
        long big = scanner.nextLong();
        System.out.println("long " + big);
        boolean flag = scanner.nextBoolean();
        System.out.println("flag " + flag);
        int count = 0;
        int total = 0;
        while (scanner.hasNextInt()) {
            total += scanner.nextInt();
            count++;
        }
        System.out.println(count + " more ints, total " + total);
        System.out.println("rest: " + (scanner.hasNextLine() ? scanner.nextLine() : "<none>"));
        while (scanner.hasNextLine()) {
            System.out.println("line: " + scanner.nextLine());
        }
        System.out.println("hasNext at end: " + scanner.hasNext());
    }
}
