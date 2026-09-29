import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> list = new ArrayList<>();
        for (int i = 10; i <= 60; i += 10) {
            list.add(i);
        }
        System.out.println(list);
        list.remove(1);
        System.out.println(list);
        list.remove(Integer.valueOf(40));
        System.out.println(list);
        System.out.println(list.contains(50) + " " + list.indexOf(50) + " " + list.indexOf(99) + " " + list.size());
        list.add(0, 5);
        list.set(2, 33);
        System.out.println(list + " " + list.get(2));
        Collections.sort(list);
        System.out.println(list);
        List<String> fixed = List.of("x", "y", "z");
        List<String> copy = new ArrayList<>(fixed);
        copy.add("w");
        System.out.println(fixed + " " + copy + " " + copy.subList(1, 3));
        List<String> asList = Arrays.asList("b", "a", "c");
        Collections.sort(asList);
        System.out.println(asList);
        ArrayList<String> names = new ArrayList<>(List.of("Ville", "Anna", "Pekka", "Ella"));
        names.removeIf(n -> n.startsWith("P"));
        System.out.println(names + " " + names.isEmpty());
        int[] array = {5, 3, 9, 1};
        Arrays.sort(array);
        System.out.println(Arrays.toString(array) + " " + Arrays.binarySearch(array, 9));
        int[][] grid = {{1, 2, 3}, {4, 5, 6}};
        System.out.println(Arrays.deepToString(grid) + " " + grid[1].length);
        ArrayList<Object> mixed = new ArrayList<>();
        mixed.add(1);
        mixed.add("two");
        mixed.add(3.0);
        mixed.add(null);
        mixed.add('c');
        System.out.println(mixed);
    }
}
