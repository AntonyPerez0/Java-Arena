import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        String text = "  Java Arena teaches Java  ";
        System.out.println("[" + text.trim() + "] [" + text.strip() + "]");
        String s = text.trim();
        System.out.println(s.length() + " " + s.charAt(5) + " " + s.indexOf("Java") + " " + s.lastIndexOf("Java"));
        System.out.println(s.substring(5) + "|" + s.substring(5, 10) + "|" + s.toUpperCase() + "|" + s.toLowerCase());
        System.out.println(s.contains("teach") + " " + s.startsWith("Java") + " " + s.endsWith("x"));
        System.out.println(s.replace("Java", "Kotlin") + " " + s.replaceAll("[aeiou]", "*"));
        System.out.println(Arrays.toString("a,b,,c,".split(",")) + " " + Arrays.toString("one  two".split(" ")));
        System.out.println(Arrays.toString("2024-09-28".split("-")) + " " + "x1y2z3".split("\\d").length);
        String a = "hello";
        String b = "hel" + "lo";
        String c = new String("hello");
        System.out.println((a == b) + " " + (a == c) + " " + a.equals(c) + " " + a.equalsIgnoreCase("HELLO"));
        System.out.println("apple".compareTo("banana") + " " + "b".compareTo("a") + " " + "abc".compareTo("abcd"));
        System.out.println(String.join("-", "a", "b", "c") + " " + "ab".repeat(3) + " " + "".isEmpty() + " " + "  ".isBlank());
        System.out.println("level".chars().filter(ch -> ch == 'l').count());
        System.out.println(String.valueOf(3.5) + String.valueOf(true) + String.valueOf('c') + String.valueOf(42));
        System.out.println("Tab\tquote\" backslash\\ unicode ä");
        System.out.println("abc".indexOf('z') + " " + "Mississippi".indexOf("ss", 3));
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        System.out.println(new String(chars).trim());
        System.out.println(s.hashCode() + " " + "".hashCode() + " " + "Aa".hashCode() + " " + "BB".hashCode());
    }
}
