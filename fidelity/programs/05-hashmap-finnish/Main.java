import java.util.HashMap;

public class Main {
    public static void main(String[] args) {
        HashMap<String, String> dictionary = new HashMap<>();
        dictionary.put("äiti", "mother");
        dictionary.put("isä", "father");
        dictionary.put("hölmö", "fool");
        dictionary.put("kissa", "cat");
        dictionary.put("yö", "night");
        dictionary.put("sää", "weather");
        dictionary.put("öljy", "oil");
        dictionary.put("päivä", "day");
        dictionary.put("koira", "dog");
        dictionary.put("café", "cafe");
        dictionary.put("år", "year (Swedish)");
        dictionary.put("mäyrä", "badger");
        dictionary.put("ruoka", "food");
        dictionary.put("jää", "ice");
        System.out.println(dictionary);
        for (String word : dictionary.keySet()) {
            System.out.println(word + " -> " + dictionary.get(word) + " (" + word.length() + ")");
        }
        System.out.println("ÄÖÅ".toLowerCase() + " " + "äöå".toUpperCase());
    }
}
