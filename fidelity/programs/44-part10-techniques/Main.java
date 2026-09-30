import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.OptionalDouble;
import java.util.TreeMap;
import java.util.regex.PatternSyntaxException;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

public class Main {
    enum Size {
        SMALL("S", 1), MEDIUM("M", 5), LARGE("L", 10);

        private final String code;
        private final int weight;

        Size(String code, int weight) {
            this.code = code;
            this.weight = weight;
        }

        public String getCode() {
            return code;
        }

        public int times(int count) {
            return weight * count;
        }

        public boolean isBiggerThan(Size other) {
            return compareTo(other) > 0;
        }
    }

    public static void main(String[] args) throws IOException {
        stringBuilders();
        regularExpressions();
        enums();
        iterators();
        List<Book> books = readBooks();
        sorting(books);
        streams(books);
    }

    static void stringBuilders() {
        StringBuilder sb = new StringBuilder("arena");
        sb.append('!').append(21).append(" java").append(2.5).append(true);
        sb.insert(0, ">> ").insert(5, '_');
        System.out.println(sb + " (" + sb.length() + ")");
        sb.deleteCharAt(0).deleteCharAt(0).deleteCharAt(sb.length() - 1);
        System.out.println("[" + sb + "] " + sb.indexOf("java") + " " + sb.charAt(3));
        System.out.println(new StringBuilder("stressed").reverse() + " " + new StringBuilder("level").reverse().toString().equals("level"));
        StringBuilder numbers = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            numbers.append(i);
            if (i < 5) {
                numbers.append(", ");
            }
        }
        System.out.println(numbers.insert(0, "{").append("}"));
        StringBuilder word = new StringBuilder("programming");
        for (int i = word.length() - 1; i >= 0; i--) {
            if ("aeiou".indexOf(word.charAt(i)) >= 0) {
                word.deleteCharAt(i);
            }
        }
        System.out.println(word + " " + word.reverse() + " " + word.length());
        try {
            new StringBuilder("abc").deleteCharAt(3);
        } catch (StringIndexOutOfBoundsException e) {
            System.out.println(e.getMessage());
        }
        try {
            new StringBuilder("abc").insert(5, "x");
        } catch (StringIndexOutOfBoundsException e) {
            System.out.println(e.getMessage());
        }
    }

    static void regularExpressions() {
        String[] codes = {"4321", "12a4", "00000", "", "987654"};
        for (String code : codes) {
            System.out.println("'" + code + "' " + code.matches("[0-9]{4,5}") + " " + code.matches("\\d*") + " " + code.matches("[1-9].*"));
        }
        System.out.println("aabbcc".matches("(a|b)*c+") + " " + "abcdc".matches("(ab|cd)+c?") + " " + "ab".matches("a?b*c?") + " " + "Tue".matches("Mon|Tue|Wed"));
        System.out.println("2026-09-30".replaceAll("(\\d{4})-(\\d{2})-(\\d{2})", "$3.$2.$1"));
        System.out.println("too   many    spaces".replaceAll("\\s+", " ") + "|" + "Hello, World! 123".replaceAll("[^a-zA-Z]", ""));
        System.out.println(Arrays.toString("one1two22three333four".split("\\d+")) + " " + Arrays.toString("a,b;c d".split("[,; ]")));
        System.out.println(Arrays.toString("x|y|z".split("\\|")) + " " + Arrays.toString("1.5.3".split("\\.")) + " " + "a.b".split(".").length);
        System.out.println("Mississippi".replaceAll("(ss)+", "S") + " " + "cat hat bat".replaceAll("(c|h)at", "$1ot") + " " + "banana".replaceFirst("an", "AN"));
        System.out.println(Arrays.toString("key = value = more".split("\\s*=\\s*", 2)) + " " + "x1y22z".replaceAll("[0-9]", "#"));
        String[] regexes = {"+", "[a-z", "(ab", "ab)", "a{x}", "[z-a]"};
        for (String regex : regexes) {
            try {
                "a+b".split(regex);
            } catch (PatternSyntaxException e) {
                System.out.println(e.getDescription() + " | " + e.getIndex() + " | " + e.getPattern());
                System.out.println(e.getMessage());
            }
        }
    }

    static void enums() {
        for (Size s : Size.values()) {
            System.out.println(s + " " + s.ordinal() + " " + s.getCode() + " " + s.times(3) + " " + s.name().toLowerCase());
        }
        Size m = Size.valueOf("MEDIUM");
        System.out.println(m + " " + m.isBiggerThan(Size.SMALL) + " " + m.isBiggerThan(Size.LARGE) + " " + (m == Size.MEDIUM) + " " + m.compareTo(Size.LARGE));
        switch (m) {
            case SMALL -> System.out.println("small");
            case MEDIUM -> System.out.println("medium");
            default -> System.out.println("other");
        }
        Map<Size, Integer> counts = new TreeMap<>();
        for (String s : "L S L M L S".split(" ")) {
            for (Size size : Size.values()) {
                if (size.getCode().equals(s)) {
                    counts.put(size, counts.getOrDefault(size, 0) + 1);
                }
            }
        }
        System.out.println(counts);
        try {
            Size.valueOf("medium");
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }

    static void iterators() {
        List<Integer> values = new ArrayList<>(List.of(5, 12, 7, 20, 3, 14));
        Iterator<Integer> it = values.iterator();
        while (it.hasNext()) {
            if (it.next() > 10) {
                it.remove();
            }
        }
        System.out.println(values);
        Map<String, Integer> stock = new TreeMap<>(Map.of("apple", 0, "pear", 3, "plum", 0, "fig", 8));
        Iterator<Map.Entry<String, Integer>> entries = stock.entrySet().iterator();
        while (entries.hasNext()) {
            Map.Entry<String, Integer> entry = entries.next();
            if (entry.getValue() == 0) {
                entries.remove();
            }
        }
        System.out.println(stock);
        try {
            values.iterator().remove();
        } catch (IllegalStateException e) {
            System.out.println("remove first: " + e);
        }
        Iterator<Integer> end = values.iterator();
        while (end.hasNext()) {
            end.next();
        }
        try {
            end.next();
        } catch (NoSuchElementException e) {
            System.out.println("past the end: " + e);
        }
    }

    static List<Book> readBooks() throws IOException {
        try (Stream<String> lines = Files.lines(Paths.get("books.txt"))) {
            return lines.skip(1).filter(line -> !line.isBlank()).map(Book::parse).collect(Collectors.toList());
        }
    }

    static void sorting(List<Book> books) {
        Collections.sort(books);
        System.out.println(books.stream().map(Book::getTitle).collect(Collectors.joining(", ")));
        books.sort(Comparator.comparing(Book::getAuthor).thenComparing(Book::getYear));
        books.forEach(System.out::println);
        books.sort(Comparator.comparing(Book::getYear).reversed());
        System.out.println(books.stream().map(b -> b.getYear() + "").collect(Collectors.joining(" ")));
        books.sort(Comparator.comparing(Book::getAuthor, Comparator.reverseOrder()).thenComparing(Book::getPages, Comparator.reverseOrder()));
        System.out.println(books.stream().map(b -> b.getAuthor().charAt(0) + "" + b.getPages()).collect(Collectors.joining(" ")));
        books.sort((a, b) -> Integer.compare(b.getPages(), a.getPages()));
        System.out.println(books.get(0).getTitle() + " / " + books.get(books.size() - 1).getTitle());
        List<Book> byTitleLength = books.stream().sorted(Comparator.comparingInt((Book b) -> b.getTitle().length()).thenComparing(Comparator.naturalOrder())).collect(Collectors.toList());
        System.out.println(byTitleLength.stream().map(Book::getTitle).collect(Collectors.toList()));
    }

    static void streams(List<Book> books) {
        System.out.println(IntStream.range(0, 5).boxed().collect(Collectors.toList()) + " " + IntStream.rangeClosed(1, 5).reduce(1, (a, b) -> a * b));
        System.out.println(IntStream.rangeClosed(1, 10).filter(i -> i % 3 == 0).boxed().map(String::valueOf).collect(Collectors.joining(" + ", "[", "]")));
        System.out.println(books.stream().map(Book::getPages).reduce(0, Integer::sum) + " " + books.stream().mapToInt(Book::getPages).sum());
        System.out.println(books.stream().sorted().map(Book::getTitle).reduce("", (a, b) -> a.isEmpty() ? b : a + " | " + b));
        System.out.println(books.stream().reduce((a, b) -> a.getPages() >= b.getPages() ? a : b).get());
        int limit = 300;
        System.out.println(books.stream().filter(b -> b.getPages() > limit).count() + " books over " + limit + " pages");
        Map<String, List<String>> byAuthor = books.stream().sorted().collect(Collectors.groupingBy(Book::getAuthor, TreeMap::new, Collectors.mapping(Book::getTitle, Collectors.toList())));
        System.out.println(byAuthor);
        Map<Integer, Long> byCentury = books.stream().collect(Collectors.groupingBy(b -> b.getYear() / 100 + 1, TreeMap::new, Collectors.counting()));
        System.out.println(byCentury);
        Map<Boolean, List<Integer>> thick = books.stream().map(Book::getPages).sorted().collect(Collectors.partitioningBy(p -> p > 400));
        System.out.println(thick);
        System.out.println(books.stream().mapToInt(Book::getPages).average().getAsDouble() + " " + books.stream().mapToInt(Book::getYear).max().getAsInt());
        OptionalDouble none = books.stream().filter(b -> b.getYear() > 3000).mapToInt(Book::getPages).average();
        System.out.println(none + " " + none.isPresent() + " " + none.orElse(0));
        try {
            none.getAsDouble();
        } catch (NoSuchElementException e) {
            System.out.println(e.getMessage());
        }
        Stream<Book> once = books.stream();
        System.out.println(once.count());
        try {
            once.count();
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());
        }
        System.out.println(Arrays.stream(new int[] {3, 1, 2}).map(x -> x * x).sum() + " " + Arrays.stream(new String[] {"b", "a"}).sorted().toList());
        Map<String, Integer> lengths = Stream.of("x", "yy", "zzz", "yy").distinct().collect(Collectors.toMap(s -> s, String::length, (a, b) -> a, TreeMap::new));
        System.out.println(lengths);
    }
}
