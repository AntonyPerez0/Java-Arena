import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        HashSet<String> words = new HashSet<>();
        for (String w : "the quick brown fox jumps over the lazy dog and the cat".split(" ")) {
            words.add(w);
        }
        System.out.println(words);
        System.out.println(words.size() + " " + words.contains("fox") + " " + words.contains("wolf"));
        HashSet<Integer> numbers = new HashSet<>(List.of(5, 17, -3, 100, 2048, 31, 64, 999999, 0));
        System.out.println(numbers);
        HashSet<Character> letters = new HashSet<>();
        for (char c : "programming".toCharArray()) {
            letters.add(c);
        }
        System.out.println(letters);
        List<String> sorted = new ArrayList<>(words);
        java.util.Collections.sort(sorted);
        System.out.println(sorted);
    }
}
