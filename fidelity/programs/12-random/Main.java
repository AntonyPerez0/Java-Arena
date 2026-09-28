import java.util.Random;

public class Main {
    public static void main(String[] args) {
        Random random = new Random(42);
        for (int i = 0; i < 10; i++) {
            System.out.print(random.nextInt(10) + " ");
        }
        System.out.println();
        System.out.println(random.nextDouble());
        System.out.println(random.nextBoolean());
        System.out.println(random.nextGaussian());
        System.out.println(random.nextLong());
        System.out.println(random.nextFloat());
        System.out.println(random.nextInt());
        System.out.println(random.nextInt(1, 7));
        Random dice = new Random(2024);
        int[] counts = new int[7];
        for (int i = 0; i < 600; i++) {
            counts[dice.nextInt(6) + 1]++;
        }
        for (int face = 1; face <= 6; face++) {
            System.out.println(face + ": " + counts[face]);
        }
        Random r = new Random(7);
        System.out.println(r.ints(5, 0, 100).boxed().toList());
        System.out.println(r.doubles(2).boxed().toList());
    }
}
