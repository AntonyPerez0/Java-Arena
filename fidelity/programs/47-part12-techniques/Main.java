import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class Main {
    public static void main(String[] args) {
        genericClasses();
        ownList();
        ownMap();
        randomNumbers();
        twoDimensionalArrays();
        mistakesCaught();
    }

    static <T extends Comparable<T>> T largest(List<T> values) {
        T best = values.get(0);
        for (T value : values) {
            if (value.compareTo(best) > 0) {
                best = value;
            }
        }
        return best;
    }

    static <T> void emptyInto(Container<T> container, List<T> into) {
        while (!container.isEmpty()) {
            into.add(container.take());
        }
    }

    static void genericClasses() {
        Box<String> text = new Box<>("hello");
        Box<Integer> number = new Box<>(41);
        number.set(number.get() + 1);
        Box<List<Double>> prices = new Box<>(new ArrayList<>());
        prices.get().add(2.5);
        prices.get().add(0.1 + 0.2);
        System.out.println(text + " " + number + " " + prices + " " + new Box<String>(null).isEmpty());
        int doubled = number.get() * 2;
        System.out.println(text.get().length() + " " + doubled);

        Pair<String, Integer> age = new Pair<>("Ada", 36);
        Pair<Integer, String> back = age.swapped();
        System.out.println(age + " " + back + " " + back.getKey() / 7 + " " + age.getKey().toUpperCase());
        List<Pair<String, Double>> points = new ArrayList<>();
        points.add(new Pair<>("x", 1.5));
        points.add(new Pair<>("y", -0.25));
        double sum = 0;
        for (Pair<String, Double> p : points) {
            sum += p.getValue();
        }
        System.out.println(points + " " + sum);

        Container<Integer> pipe = new Pipe<>();
        for (int i = 1; i <= 5; i++) {
            pipe.put(i * i);
        }
        List<Integer> squares = new ArrayList<>();
        emptyInto(pipe, squares);
        Container<String> mailbox = new Mailbox(3);
        mailbox.put("first");
        mailbox.put("second");
        mailbox.put("third");
        mailbox.put("dropped");
        List<String> messages = new ArrayList<>();
        emptyInto(mailbox, messages);
        System.out.println(squares + " " + messages + " " + pipe.isEmpty());
        System.out.println(largest(squares) + " " + largest(messages) + " " + largest(Arrays.asList(2.5, -1.0, 9.75)));
    }

    static void ownList() {
        OwnList<String> names = new OwnList<>();
        System.out.println(names + " " + names.size() + " " + names.capacity());
        for (String name : "Ada Grace Linus Barbara Edsger Alan Margaret".split(" ")) {
            names.add(name);
            System.out.print(names.capacity() + " ");
        }
        System.out.println();
        System.out.println(names + " " + names.size());
        System.out.println(names.contains("Linus") + " " + names.contains("linus") + " " + names.indexOf("Alan") + " " + names.indexOf("Dennis"));
        names.remove("Ada");
        names.remove("Edsger");
        names.remove("nobody");
        System.out.println(names + " " + names.size() + " " + names.value(0) + " " + names.value(names.size() - 1));
        OwnList<Integer> numbers = new OwnList<>();
        for (int i = 10; i > 0; i -= 3) {
            numbers.add(i);
        }
        int total = 0;
        for (int i = 0; i < numbers.size(); i++) {
            total += numbers.value(i);
        }
        System.out.println(numbers + " " + total + " " + numbers.indexOf(4));
    }

    static void ownMap() {
        OwnMap<String, Integer> population = new OwnMap<>();
        String[] cities = { "Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Jyvaskyla", "Lahti", "Kuopio", "Pori", "Ada Lovelace", "polygenelubricants" };
        for (int i = 0; i < cities.length; i++) {
            population.put(cities[i], (i + 1) * 1000);
            if (i == 5 || i == 6) {
                System.out.println(population.size() + " in " + population.buckets() + " buckets");
            }
        }
        System.out.println(population);
        System.out.println(population.size() + " in " + population.buckets() + " buckets");
        population.put("Espoo", 305274);
        System.out.println(population.get("Espoo") + " " + population.get("Helsinki") + " " + population.get("Stockholm") + " " + population.get("polygenelubricants"));
        System.out.println(population.remove("Turku") + " " + population.remove("Turku") + " " + population.get("Turku") + " " + population.size());
        OwnMap<String, OwnList<String>> groups = new OwnMap<>();
        for (String word : "apple avocado banana blueberry cherry apricot".split(" ")) {
            String letter = word.substring(0, 1);
            if (groups.get(letter) == null) {
                groups.put(letter, new OwnList<>());
            }
            groups.get(letter).add(word);
        }
        System.out.println(groups);
    }

    static void randomNumbers() {
        Random random = new Random(12);
        System.out.println(random.nextInt() + " " + random.nextInt(10) + " " + random.nextInt(5, 10) + " " + random.nextInt(1));
        System.out.println(random.nextDouble() + " " + random.nextBoolean() + " " + random.nextGaussian());
        int[] dice = new int[7];
        Random die = new Random(2026);
        for (int i = 0; i < 1200; i++) {
            dice[die.nextInt(6) + 1]++;
        }
        System.out.println(Arrays.toString(dice));
        System.out.println(new Random(5).ints(6, 1, 50).boxed().toList() + " " + new Random(5).ints(6, 1, 50).sum());
        double average = 0;
        Random gauss = new Random(3);
        for (int i = 0; i < 1000; i++) {
            average += gauss.nextGaussian() * 15 + 100;
        }
        System.out.printf("%.6f%n", average / 1000);
        List<String> deck = new ArrayList<>();
        for (String suit : new String[] { "S", "H" }) {
            for (int rank = 1; rank <= 6; rank++) {
                deck.add(suit + rank);
            }
        }
        Random shuffler = new Random(99);
        Collections.shuffle(deck, shuffler);
        System.out.println(deck + " " + deck.get(shuffler.nextInt(deck.size())));
        Random a = new Random(77);
        Random b = new Random(77);
        boolean same = true;
        for (int i = 0; i < 100; i++) {
            same = same && a.nextInt(1000) == b.nextInt(1000);
        }
        System.out.println(same + " " + (new Random(1).nextLong() == new Random(1).nextLong()));
    }

    static void twoDimensionalArrays() {
        int[][] grid = new int[3][4];
        for (int row = 0; row < grid.length; row++) {
            for (int column = 0; column < grid[row].length; column++) {
                grid[row][column] = row * 10 + column;
            }
        }
        grid[2][3] = -7;
        System.out.println(Arrays.deepToString(grid) + " " + grid.length + "x" + grid[0].length);
        for (int[] row : grid) {
            int rowSum = 0;
            for (int value : row) {
                rowSum += value;
                System.out.print(String.format("%4d", value));
            }
            System.out.println(" | " + rowSum);
        }
        int[] columnSums = new int[grid[0].length];
        for (int column = 0; column < grid[0].length; column++) {
            for (int row = 0; row < grid.length; row++) {
                columnSums[column] += grid[row][column];
            }
        }
        System.out.println(Arrays.toString(columnSums) + " " + Arrays.toString(grid[1]));

        int[][] pascal = new int[6][];
        for (int row = 0; row < pascal.length; row++) {
            pascal[row] = new int[row + 1];
            pascal[row][0] = 1;
            pascal[row][row] = 1;
            for (int k = 1; k < row; k++) {
                pascal[row][k] = pascal[row - 1][k - 1] + pascal[row - 1][k];
            }
        }
        System.out.println(Arrays.deepToString(pascal) + " " + pascal[5].length);

        String[][] board = new String[3][3];
        System.out.println(Arrays.deepToString(board));
        for (String[] row : board) {
            Arrays.fill(row, ".");
        }
        board[0][0] = "X";
        board[1][1] = "O";
        board[2][0] = "X";
        for (String[] row : board) {
            System.out.println(String.join("", row));
        }
        String[][] words = { { "a", "bb" }, { "ccc" }, {} };
        System.out.println(Arrays.deepToString(words) + " " + words[2].length + " " + words[0][1].length());
        double[][] matrix = new double[2][2];
        matrix[0][1] = 0.1 * 3;
        char[][] letters = { "hi".toCharArray(), "java".toCharArray() };
        boolean[][] flags = new boolean[1][2];
        System.out.println(Arrays.deepToString(matrix) + " " + Arrays.deepToString(letters) + " " + Arrays.deepToString(flags));
        // A boolean grid created in one new: its rows are boolean[] (copied, swapped, kept in a list and compared as such).
        boolean[][] seen = new boolean[2][3];
        seen[1][2] = true;
        boolean[] cloned = seen[1].clone();
        boolean[] copied = new boolean[3];
        System.arraycopy(seen[1], 0, copied, 0, 3);
        boolean[] longer = Arrays.copyOf(seen[1], 4);
        boolean[] first = seen[0];
        seen[0] = seen[1];
        seen[1] = first;
        List<boolean[]> rows = new ArrayList<>(Arrays.asList(seen));
        boolean[] back = rows.get(0);
        Object kept = seen[1];
        boolean[][] literal = { { false, false, true }, { false, false, false } };
        System.out.println(Arrays.toString(cloned) + " " + Arrays.toString(copied) + " " + Arrays.toString(longer) + " " + back[2] + " " + (kept instanceof boolean[]) + " " + (kept instanceof byte[]) + " " + kept.getClass().getName());
        System.out.println(Arrays.deepEquals(seen, literal) + " " + (Arrays.deepHashCode(seen) == Arrays.deepHashCode(literal)) + " " + Arrays.deepToString(new boolean[1][1][2]));
        int[][] copy = new int[grid.length][];
        for (int row = 0; row < grid.length; row++) {
            copy[row] = grid[row].clone();
        }
        copy[0][0] = 99;
        System.out.println(grid[0][0] + " " + copy[0][0] + " " + Arrays.deepEquals(grid, copy) + " " + (grid[1] == copy[1]));
        long[][][] cube = new long[2][2][2];
        cube[1][1][1] = Long.MAX_VALUE;
        System.out.println(Arrays.deepToString(cube));
    }

    static void mistakesCaught() {
        try {
            int size = 3 - 5;
            int[][] grid = new int[size][2];
            System.out.println(grid.length);
        } catch (NegativeArraySizeException e) {
            System.out.println("NegativeArraySizeException: " + e.getMessage());
        }
        try {
            int[][] grid = new int[3][4];
            grid[1][4] = 1;
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("ArrayIndexOutOfBoundsException: " + e.getMessage());
        }
        try {
            int[][] grid = new int[3][4];
            grid[3][0] = 1;
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("ArrayIndexOutOfBoundsException: " + e.getMessage());
        }
        Random random = new Random(1);
        try {
            System.out.println(random.nextInt(0));
        } catch (IllegalArgumentException e) {
            System.out.println("IllegalArgumentException: " + e.getMessage());
        }
        try {
            System.out.println(random.nextInt(5, 5));
        } catch (IllegalArgumentException e) {
            System.out.println("IllegalArgumentException: " + e.getMessage());
        }
        try {
            System.out.println(new ArrayList<String>(-1));
        } catch (IllegalArgumentException e) {
            System.out.println("IllegalArgumentException: " + e.getMessage());
        }
        OwnList<String> list = new OwnList<>();
        list.add("only");
        try {
            System.out.println(list.value(1));
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("ArrayIndexOutOfBoundsException: " + e.getMessage());
        }
        try {
            String[] all = list.rawValues();
            System.out.println(all.length);
        } catch (ClassCastException e) {
            System.out.println("ClassCastException: " + e.getMessage());
        }
        Object[] objects = list.rawValues();
        System.out.println(objects.length + " " + objects[0] + " " + objects.getClass().getSimpleName());
    }
}
