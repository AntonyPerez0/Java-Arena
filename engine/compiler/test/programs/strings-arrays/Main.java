import java.util.*;

public class Main {
    static String reverse(String s) { return new StringBuilder(s).reverse().toString(); }

    static boolean isPalindrome(String s) {
        String clean = s.toLowerCase().replaceAll("[^a-zäöå]", "");
        return clean.equals(reverse(clean));
    }

    public static void main(String[] args) {
        String s = "  Hello, Java Arena!  ";
        System.out.println("[" + s.trim() + "] [" + s.strip() + "] " + s.length() + " " + s.isBlank());
        System.out.println(s.toUpperCase() + s.indexOf("Java") + s.charAt(3) + s.substring(9, 13));
        System.out.println(String.join("|", "a", "b", "c") + " " + "a,b,,c".split(",").length + " " + Arrays.toString("x1y22z".split("\\d+")));
        System.out.println(isPalindrome("Saippuakivikauppias") + " " + isPalindrome("Java"));
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5; i++) sb.append(i).append(',');
        sb.setLength(sb.length() - 1);
        sb.insert(0, "[").append("]");
        System.out.println(sb + " " + sb.indexOf("3"));
        System.out.println("abc".compareTo("abd") + " " + "B".compareToIgnoreCase("a") + " " + "ab".repeat(3) + " " + "x".equals(new String("x")));
        String a = "hel", b = "lo";
        String c = a + b;
        System.out.println((c == "hello") + " " + (c.intern() == "hello") + " " + ("hel" + "lo" == "hello"));
        char ch = 'a';
        ch += 2;
        System.out.println(ch + " " + (char) (ch + 1) + " " + (int) ch + " " + Character.isLetter('ä') + " " + Character.toUpperCase('ö'));
        int[] arr = {5, 2, 9, 1, 7};
        int[] copy = Arrays.copyOf(arr, 7);
        Arrays.sort(arr);
        System.out.println(Arrays.toString(arr) + " " + Arrays.toString(copy) + " " + Arrays.binarySearch(arr, 7));
        System.out.println(String.valueOf(3.0f) + " " + Integer.toBinaryString(42) + " " + Integer.toHexString(-1) + " " + Long.MAX_VALUE + " " + (Integer.MAX_VALUE + 1));
        System.out.println(String.format("%5d|%-5s|%08.3f|%,d|%x|%e|%10.4f|%b", 42, "ab", 3.14159, 1234567, 255, 12345.678, Math.E, true));
        System.out.println(Math.round(2.5) + " " + Math.round(-2.5) + " " + Math.floor(-1.1) + " " + Math.abs(-7) + " " + Math.pow(2, 10) + " " + Math.sqrt(2) + " " + Math.max(3, 8));
        System.out.println(10 / 3 + " " + 10 % 3 + " " + -10 / 3 + " " + -10 % 3 + " " + 10.0 / 3 + " " + 1 / 2.0 + " " + (7 >> 1) + " " + (-7 >>> 28) + " " + (5 & 3) + " " + (5 ^ 3));
    }
}
