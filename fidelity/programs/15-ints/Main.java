public class Main {
    public static void main(String[] args) {
        int big = Integer.MAX_VALUE;
        System.out.println(big + 1);
        System.out.println(100000 * 100000);
        System.out.println(100000L * 100000);
        System.out.println(Long.MAX_VALUE + " " + Long.MIN_VALUE);
        System.out.println(7 / 2 + " " + 7 % 3 + " " + -7 % 3 + " " + 7 % -3);
        System.out.println((int) 3.99 + " " + (int) -3.99 + " " + (int) 1e20 + " " + (long) 1e20);
        System.out.println((byte) 200 + " " + (short) 70000 + " " + (char) 74);
        char c = 'a';
        System.out.println(c + 1);
        System.out.println((char) (c + 1));
        c++;
        System.out.println(c);
        System.out.println('a' + 'b' + " " + "a" + 'b');
        System.out.println(Integer.toBinaryString(42) + " " + Integer.toHexString(255) + " " + Integer.parseInt("-123"));
        System.out.println(Integer.MIN_VALUE / -1);
        System.out.println(1 << 31);
        System.out.println(-8 >> 1);
        System.out.println(-8 >>> 28);
        int x = 5;
        x += 3.7;
        System.out.println(x);
        System.out.println(Integer.valueOf(127) == Integer.valueOf(127));
        System.out.println(Integer.compare(3, 7) + " " + Character.isDigit('7') + " " + Character.getNumericValue('7'));
    }
}
