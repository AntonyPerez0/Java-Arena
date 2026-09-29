import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, String> dict = new HashMap<>();
        dict.put("kirja", "book"); dict.put("auto", "car"); dict.put("ohjelmointi", "programming");
        dict.put("tietokone", "computer"); dict.put("hiiri", "mouse"); dict.put("näppäimistö", "keyboard");
        System.out.println(dict);
        for (String k : dict.keySet()) System.out.print(k + " ");
        System.out.println();
        Set<String> set = new HashSet<>(Arrays.asList("banana", "apple", "cherry", "date", "elderberry", "fig", "grape"));
        System.out.println(set);
        Map<Integer, List<String>> byLen = new HashMap<>();
        for (String s : set) byLen.computeIfAbsent(s.length(), k -> new ArrayList<>()).add(s);
        System.out.println(byLen);
        Map<Character, Integer> freq = new TreeMap<>();
        for (char c : "mississippi".toCharArray()) freq.put(c, freq.getOrDefault(c, 0) + 1);
        System.out.println(freq);
        LinkedHashMap<String, Integer> lhm = new LinkedHashMap<>();
        lhm.put("z", 1); lhm.put("a", 2); lhm.putIfAbsent("z", 3);
        System.out.println(lhm + " " + lhm.containsKey("a") + " " + lhm.get("q"));
        List<Integer> nums = new ArrayList<>();
        for (int i = 0; i < 10; i++) nums.add(i * i % 7);
        nums.removeIf(n -> n == 2);
        System.out.println(nums + " " + nums.indexOf(4) + " " + nums.contains(9) + " " + nums.subList(1, 4));
        Iterator<Integer> it = nums.iterator();
        while (it.hasNext()) if (it.next() % 2 == 0) it.remove();
        System.out.println(nums);
        Random rnd = new Random(42);
        List<Integer> shuffled = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6, 7, 8));
        Collections.shuffle(shuffled, rnd);
        System.out.println(shuffled + " " + rnd.nextInt(100) + " " + rnd.nextDouble());
        Integer a = 127, b = 127, c = 128, d = 128;
        System.out.println((a == b) + " " + (c == d) + " " + c.equals(d));
        int[][] grid = new int[3][4];
        for (int i = 0; i < 3; i++) for (int j = 0; j < 4; j++) grid[i][j] = i * j;
        System.out.println(Arrays.deepToString(grid));
    }
}
