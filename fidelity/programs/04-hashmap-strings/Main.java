import java.util.HashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        HashMap<String, Integer> ages = new HashMap<>();
        String[] names = {"Ada", "Linus", "Grace", "Alan", "Barbara", "Edsger", "Donald", "Margaret",
                "Ken", "Dennis", "Bjarne", "James", "Guido", "Anders", "Tim", "Radia", "Frances", "John"};
        for (int i = 0; i < names.length; i++) {
            ages.put(names[i], 20 + i * 3);
        }
        System.out.println(ages);
        for (String key : ages.keySet()) {
            System.out.print(key + " ");
        }
        System.out.println();
        System.out.println(ages.values());
        for (Map.Entry<String, Integer> entry : ages.entrySet()) {
            if (entry.getValue() % 2 == 0) {
                System.out.print(entry.getKey() + "=" + entry.getValue() + ";");
            }
        }
        System.out.println();
        ages.remove("Ada");
        ages.putIfAbsent("Ada", 99);
        System.out.println(ages.get("Ada") + " " + ages.getOrDefault("Nobody", -1) + " " + ages.containsKey("Tim"));
        HashMap<Integer, String> byNumber = new HashMap<>();
        int[] keys = {100, 3, -7, 42, 1024, 65536, 17, 5000000, -1};
        for (int k : keys) {
            byNumber.put(k, "v" + k);
        }
        System.out.println(byNumber);
    }
}
