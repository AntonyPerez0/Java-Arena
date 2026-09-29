import java.util.ArrayList;

public class Main {
    public static int longest(ArrayList<String> words) {
        int best = 0;
        for (String word : words) {
            if (word.length() > best) {
                best = word.length();
            }
        }
        return best;
    }

    public static void main(String[] args) {
        ArrayList<String> words = new ArrayList<>();
        words.add("list");
        words.add(null);
        words.add("array");
        System.out.println(longest(words));
    }
}
