import java.util.*;

public class Randoms {
    public static void main(String[] args) {
        Random random = new Random(42);
        for (int i = 0; i < 10; i++) System.out.print(random.nextInt(10) + " ");
        System.out.println();
        System.out.println(random.nextDouble() + " " + random.nextBoolean() + " " + random.nextGaussian());
        System.out.println(random.nextLong() + " " + random.nextFloat() + " " + random.nextInt() + " " + random.nextInt(5, 10));
        List<Integer> list = new ArrayList<>();
        for (int i = 1; i <= 12; i++) list.add(i);
        Collections.shuffle(list, new Random(7));
        System.out.println(list);
        Random dice = new Random(2024);
        int[] counts = new int[6];
        for (int i = 0; i < 6000; i++) counts[dice.nextInt(6)]++;
        System.out.println(Arrays.toString(counts));
        System.out.println(new Random(1).ints(5, 0, 100).boxed().toList());
        System.out.println(new Random(3).doubles(3).sum());
    }
}
