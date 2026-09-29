import java.util.ArrayList;
import java.util.Arrays;

public class Main {
    public static void fill(int[] target, int value) {
        for (int i = 0; i < target.length; i++) {
            target[i] = value;
        }
    }

    public static int[] doubled(int[] source) {
        int[] result = new int[source.length];
        for (int i = 0; i < source.length; i++) {
            result[i] = source[i] * 2;
        }
        return result;
    }

    public static void main(String[] args) {
        int[] ints = new int[3];
        double[] doubles = new double[2];
        boolean[] flags = new boolean[2];
        String[] texts = new String[2];
        char[] letters = new char[2];
        System.out.println(Arrays.toString(ints) + " " + Arrays.toString(doubles) + " " + Arrays.toString(flags) + " " + Arrays.toString(texts));
        System.out.println((int) letters[0] + " " + letters.length);
        int[] a = {1, 2, 3};
        int[] b = a;
        b[0] = 99;
        System.out.println(a[0] + " " + (a == b) + " " + Arrays.equals(a, new int[] {99, 2, 3}) + " " + a.equals(new int[] {99, 2, 3}));
        int[] c = a.clone();
        c[1] = 42;
        System.out.println(Arrays.toString(a) + " " + Arrays.toString(c) + " " + Arrays.toString(Arrays.copyOf(a, 5)) + " " + Arrays.toString(Arrays.copyOfRange(a, 1, 3)));
        fill(a, 7);
        System.out.println(Arrays.toString(a) + " " + Arrays.toString(doubled(a)));
        String[] words = {"kiwi", "fig", "banana"};
        int total = 0;
        for (String word : words) {
            total += word.length();
        }
        System.out.println(total + " " + String.join("+", words) + " " + words[words.length - 1].charAt(0));
        char ch = 'a';
        ch++;
        System.out.println(ch + " " + (char) (ch + 1) + " " + (ch + 1) + " " + Character.isDigit('7') + " " + Character.toUpperCase('q') + " " + Character.getNumericValue('7'));
        double[] temps = {21.5, 19.0, 23.25};
        double sum = 0;
        for (double t : temps) {
            sum += t;
        }
        System.out.println(sum / temps.length);
        ArrayList<Integer> list = new ArrayList<>();
        for (int n : new int[] {5, 1, 4}) {
            list.add(n);
        }
        list.remove(1);
        list.remove(Integer.valueOf(5));
        System.out.println(list + " " + list.size());
        System.out.println(Arrays.toString("a b  c ".split(" ")) + " " + Arrays.toString(" x y".split(" ")) + " " + "a;b;c".split(";").length);
        System.out.println(Arrays.toString("Ada, 36".split(",")) + " " + Arrays.toString("1.5".split("\\.")) + " " + Arrays.toString("1.5".split(".")));
        String sentence = "the quick brown fox";
        System.out.println(sentence.indexOf("quick") + " " + sentence.indexOf('o') + " " + sentence.lastIndexOf('o') + " " + sentence.substring(sentence.indexOf(' ') + 1));
        System.out.println("Hello".equals("hello") + " " + "Hello".equalsIgnoreCase("hello") + " " + "b".compareTo("a") + " " + "Apple".compareToIgnoreCase("apple"));
        StringBuilder reversed = new StringBuilder();
        for (int i = sentence.length() - 1; i >= 0; i--) {
            reversed.append(sentence.charAt(i));
        }
        System.out.println(reversed + " " + new StringBuilder("abc").reverse());
        System.out.println(String.valueOf(new char[] {'o', 'k'}) + " " + "x".repeat(0).isEmpty() + " " + "  pad ".trim().length());
    }
}
