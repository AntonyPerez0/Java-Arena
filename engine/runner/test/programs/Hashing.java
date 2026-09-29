import java.util.*;

public class Hashing {
    public static void main(String[] args) {
        Map<String, Integer> words = new HashMap<>();
        String[] keys = {"omena", "päärynä", "kirsikka", "äiti", "öljy", "åbo", "banaani", "Zeta", "alpha",
            "kuu", "sää", "tähti", "yö", "hyvää huomenta", "", "Ä", "ö"};
        for (int i = 0; i < keys.length; i++) words.put(keys[i], i * 7 % 5);
        System.out.println(words);
        System.out.println(words.keySet());
        System.out.println(words.values());
        Map<Integer, String> numbers = new HashMap<>();
        for (int i = -5; i < 40; i += 3) numbers.put(i * 37, "n" + i);
        numbers.put(Integer.MAX_VALUE, "max");
        numbers.put(Integer.MIN_VALUE, "min");
        System.out.println(numbers);
        Set<String> set = new HashSet<>(Arrays.asList("Matti", "Maija", "Pekka", "Liisa", "Ärrä", "Öhkö", "Åke", "Anna"));
        System.out.println(set);
        Set<Integer> ints = new HashSet<>();
        for (int i = 0; i < 30; i++) ints.add(i * i * 31 % 101);
        System.out.println(ints);
        Set<Double> doubles = new HashSet<>(List.of(0.1, 2.5, -0.0, 0.0, 1e10, 3.14));
        System.out.println(doubles);
        Map<Character, Integer> chars = new HashMap<>();
        for (char c : "hyvää päivää ystävä".toCharArray()) chars.merge(c, 1, Integer::sum);
        System.out.println(chars);
        System.out.println(new TreeMap<>(words));
        System.out.println(new LinkedHashMap<>(numbers).entrySet().iterator().next());
        System.out.println("hash " + "päärynä".hashCode() + " " + List.of(1, 2, 3).hashCode() + " " + Objects.hash("a", 1));
    }
}
