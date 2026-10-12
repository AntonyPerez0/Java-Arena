import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.BinaryOperator;

// The topics of the extra modules 55 to 59, beyond the MOOC: newer Java features (records, sealed
// types with exhaustive switches, switch expressions and patterns with when, case null and nested
// record patterns, instanceof patterns, text blocks, var, String.format), and recursion (with a
// caught StackOverflowError) and linked structures (a list, a stack, a queue and a tree).
public class Main {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    public static void main(String[] args) {
        records();
        sealedShapes();
        switches();
        patterns();
        textBlocks();
        formatting();
        withVar();
        recursion();
        linked();
        trees();
    }

    static void records() {
        System.out.println("== records");
        Point p = new Point(3, 4);
        Point q = Point.of(" 3, 4 ");
        System.out.println(p + " " + q + " equal: " + p.equals(q) + ", same: " + (p == q));
        System.out.println("hash codes agree: " + (p.hashCode() == q.hashCode()));
        System.out.println(p.plus(new Point(-5, 10)) + " manhattan " + p.plus(new Point(-5, 10)).manhattan());
        System.out.println("origin " + Point.ORIGIN + ", x " + p.x() + ", y " + p.y());
        try {
            new Point(-2000, 1);
        } catch (IllegalArgumentException e) {
            System.out.println("refused: " + e.getMessage());
        }
        Name ada = new Name("  Ada ", " lovelace");
        Name solo = new Name("Cher", null);
        System.out.println(ada + " last() " + ada.last() + " | " + solo + " last() " + solo.last());
        try {
            new Name(null, "x");
        } catch (NullPointerException e) {
            System.out.println("refused: " + e.getMessage());
        }
        Pair<String, Integer> pair = new Pair<>("age", 36);
        Pair<String, List<Point>> other = pair.withSecond(List.of(p, Point.ORIGIN));
        System.out.println(pair + " " + other);
        System.out.println(new Pair<>(null, 1) + " equals " + new Pair<>(null, 1).equals(new Pair<>(null, 1)));
        Line line = new Line(p, new Point(10, -1));
        System.out.println(line + " from.x " + line.from().x());
        Set<Point> seen = new HashSet<>(List.of(p, new Point(1, 1), new Point(1, 1)));
        System.out.println("set of " + seen.size() + ", contains (3, 4): " + seen.contains(new Point(3, 4)) + ", (4, 3): " + seen.contains(new Point(4, 3)));
        Map<Point, String> names = new HashMap<>();
        names.put(new Point(0, 0), "home");
        System.out.println("map get " + names.get(Point.ORIGIN) + ", " + names.get(new Point(0, 1)));
        int[] counts = {1, 2};
        System.out.println("same array: " + new Measure("m", 1.0, counts).equals(new Measure("m", 1.0, counts)) + ", equal arrays: " + new Measure("m", 1.0, counts).equals(new Measure("m", 1.0, new int[] {1, 2})));
        System.out.println("0.0 and -0.0: " + new Square(0.0).equals(new Square(-0.0)) + ", NaN and NaN: " + new Square(Double.NaN).equals(new Square(Double.NaN)));
        System.out.println(new Circle(1.5) + " " + new Square(2) + " " + new Rect(new Point(0, 0), new Point(2, 3)) + " " + new Hexagon(1e-3));
        try {
            new Circle(-1);
        } catch (IllegalArgumentException e) {
            System.out.println("refused: " + e.getMessage());
        }
    }

    static String describe(Shape s) {
        return switch (s) {
            case Circle c when c.radius() == 0 -> "a dot";
            case Circle c -> "a circle of radius " + c.radius();
            case Square(double side) when side > 10 -> "a big square";
            case Square sq -> "a square of side " + sq.side();
            case Rect(Point(var x1, var y1), Point(int x2, int y2)) when x1 == x2 || y1 == y2 -> "a flat rectangle";
            case Rect(Point a, Point b) -> "a rectangle from " + a + " to " + b;
            case Triangle t -> "the triangle " + t;
            case Blob b -> "a blob";
            case Hexagon h -> "a hexagon of side " + h.side();
        };
    }

    static void sealedShapes() {
        System.out.println("== sealed");
        List<Shape> shapes = List.of(new Circle(0), new Circle(2), new Square(12), new Square(3), new Rect(new Point(1, 1), new Point(1, 5)), new Rect(new Point(0, 0), new Point(4, 2)), new Triangle(3, 5), new Blob() {
            @Override
            public String toString() {
                return "an odd blob";
            }
        }, new Hexagon(2));
        double total = 0;
        for (Shape s : shapes) {
            total += s.area();
            System.out.println(String.format("%-36s|%10.3f|", describe(s), s.area()));
        }
        System.out.println(String.format("total %.6f", total));
        System.out.println("a Hexagon is a Polygon: " + (shapes.get(8) instanceof Polygon) + ", a Blob subclass is a Blob: " + (shapes.get(7) instanceof Blob));
    }

    static int lettersIn(Day day) {
        return switch (day) {
            case MON, FRI, SUN -> 6;
            case TUE -> 7;
            case THU, SAT -> 8;
            case WED -> {
                int n = "Wednesday".length();
                yield n;
            }
        };
    }

    static String kind(String word) {
        return switch (word.toLowerCase()) {
            case "apple", "pear" -> "fruit";
            case "carrot" -> "vegetable";
            case "" -> "nothing";
            default -> {
                if (word.endsWith("berry")) {
                    yield "berry";
                }
                yield "unknown (" + word + ")";
            }
        };
    }

    static void switches() {
        System.out.println("== switch");
        for (Day d : Day.values()) {
            System.out.print(d + "=" + lettersIn(d) + (d == Day.SUN ? "\n" : " "));
        }
        for (String w : new String[] {"Apple", "carrot", "", "Strawberry", "kiwi"}) {
            System.out.println(w + " -> " + kind(w));
        }
        // The old switch statement, with a fall-through and yield in a colon-style expression.
        int score = 0;
        switch (3) {
            case 1:
                score += 1;
            case 3:
                score += 3;
            case 4:
                score += 4;
                break;
            default:
                score = -1;
        }
        int colon = switch ("b") {
            case "a":
                yield 1;
            case "b":
                System.out.println("in case b");
                yield 2;
            default:
                yield 0;
        };
        System.out.println("fell through to " + score + ", colon style " + colon);
        char grade = 'B';
        String said = switch (grade) {
            case 'A', 'B' -> "good";
            case 'C' -> "fine";
            default -> "see me";
        };
        System.out.println(grade + " is " + said);
    }

    static String what(Object o) {
        return switch (o) {
            case null -> "null!";
            case Integer i when i > 100 -> "a big int " + i;
            case Integer i -> "an int " + i;
            case Long l -> "a long " + l;
            case String s when s.isBlank() -> "a blank string";
            case String s -> "a string of " + s.length();
            case int[] a -> "an int array of " + a.length;
            case Point(var x, var y) when x == y -> "a diagonal point " + x;
            case Point p -> "a point " + p;
            case Line(Point(var x, var y), var to) -> "a line from " + x + "," + y + " to " + to;
            case Day d -> "a day, number " + (d.ordinal() + 1);
            case Shape s -> describe(s);
            default -> "something else: " + o.getClass().getSimpleName();
        };
    }

    static int twice(Object o) {
        if (!(o instanceof Integer n)) {
            return -1;
        }
        return n * 2;
    }

    static void patterns() {
        System.out.println("== patterns");
        Object[] things = {null, 7, 1000, 5L, "  ", "hello", new int[3], new Point(2, 2), new Point(1, 2), new Line(new Point(0, 1), new Point(5, 5)), Day.WED, new Square(1), 2.5, new StringBuilder("sb")};
        for (Object o : things) {
            System.out.println(what(o));
        }
        Object o = "patterns";
        if (o instanceof String s && s.length() > 3) {
            System.out.println("long string " + s.toUpperCase());
        }
        if (!(o instanceof Integer)) {
            System.out.println("not an Integer");
        }
        System.out.println("twice " + twice(21) + " " + twice("21"));
        Object line = new Line(new Point(1, 2), new Point(3, 4));
        if (line instanceof Line(Point from, Point(var tx, var ty)) && tx > from.x()) {
            System.out.println("goes right by " + (tx - from.x()) + " and up by " + (ty - from.y()));
        }
    }

    static void show(String label, String text) {
        System.out.println(label + ":");
        for (String row : text.split("\n", -1)) {
            System.out.println("  [" + row + "]");
        }
    }

    static void textBlocks() {
        System.out.println("== text blocks");
        String card = """
            Name:\tAda
              indented two more
            Line one \
            joined to line two
            trailing space kept:\s
            trailing spaces stripped:   
            "quotes" and \"""three\""" and a backslash \\
            """;
        show("card", card);
        String noNewline = """
            first
            last""";
        show("no final newline", noNewline);
        String shifted = """
                deeper
              less deep
            """;
        show("closing delimiter sets the margin", shifted);
        String html = """
            <p>%s has %d letters</p>
            """.formatted("Grace", "Grace".length());
        System.out.print(html);
        System.out.println("lines: " + card.lines().count() + ", equal to a plain string: " + "a\nb\n".equals("""
            a
            b
            """));
        System.out.println("[" + "   x\n  y".stripIndent() + "] [" + "tab\\there".translateEscapes() + "]");
    }

    static void formatting() {
        System.out.println("== format");
        System.out.println(String.format("[%8.2f] [%-8.2f] [%08.2f] [%.0f] [%.1f]", 3.14159, 2.5, -2.5, 2.5, 0.05));
        System.out.println(String.format("[%-10s] [%10s] [%.3s] [%s] [%S]", "left", "right", "truncate", null, "loud"));
        System.out.println(String.format("[%5d] [%-5d] [%05d] [%+d] [%x] [%X] [%o] [%,d]", 42, 42, 42, 42, 255, 255, 8, 1234567));
        System.out.println(String.format("[%e] [%.3e] [%10.4f] [%g] [%b] [%c] [%%]", 12345.678, 0.000123, Math.E, 0.0001234, "yes", 'z'));
        System.out.println(String.format(Locale.ROOT, "%,.2f|%,d", 9876543.215, -1000));
        System.out.printf("%-6s%6.1f%n", "avg", 7.25);
        System.out.printf("%-6s%6.1f%n", "max", 10.0);
        System.out.println(String.format("%3$s %1$s %2$s", "a", "b", "c"));
    }

    static void withVar() {
        System.out.println("== var");
        var words = new ArrayList<String>();
        words.add("var");
        words.add("infers");
        var lengths = new HashMap<String, Integer>();
        for (var w : words) {
            lengths.put(w, w.length());
        }
        var total = 0L;
        for (var i = 0; i < words.size(); i++) {
            total += lengths.get(words.get(i));
        }
        BinaryOperator<Integer> add = (var a, var b) -> a + b;
        var point = new Point(5, 6);
        System.out.println(words + " " + total + " " + add.apply(2, 3) + " " + point.x() + " " + ((Object) total).getClass().getSimpleName());
    }

    static int depth;

    static void dive() {
        depth++;
        dive();
    }

    static long sumTo(int n) {
        return n == 0 ? 0 : n + sumTo(n - 1);
    }

    static long fib(int n, long[] memo) {
        if (n < 2) {
            return n;
        }
        if (memo[n] == 0) {
            memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
        }
        return memo[n];
    }

    static void permutations(String done, String left, List<String> out) {
        if (left.isEmpty()) {
            out.add(done);
            return;
        }
        for (int i = 0; i < left.length(); i++) {
            permutations(done + left.charAt(i), left.substring(0, i) + left.substring(i + 1), out);
        }
    }

    static int hanoi(int disks, char from, char to, char via, StringBuilder moves) {
        if (disks == 0) {
            return 0;
        }
        int n = hanoi(disks - 1, from, via, to, moves);
        if (disks <= 2) {
            moves.append(from).append(to).append(' ');
        }
        return n + 1 + hanoi(disks - 1, via, to, from, moves);
    }

    static boolean palindrome(String s) {
        return s.length() < 2 || (s.charAt(0) == s.charAt(s.length() - 1) && palindrome(s.substring(1, s.length() - 1)));
    }

    static int find(int[] sorted, int value, int lo, int hi) {
        if (lo > hi) {
            return -(lo + 1);
        }
        int mid = (lo + hi) >>> 1;
        if (sorted[mid] == value) {
            return mid;
        }
        return sorted[mid] < value ? find(sorted, value, mid + 1, hi) : find(sorted, value, lo, mid - 1);
    }

    static int gcd(int a, int b) {
        return b == 0 ? a : gcd(b, a % b);
    }

    static void recursion() {
        System.out.println("== recursion");
        try {
            dive();
        } catch (StackOverflowError e) {
            System.out.println("caught " + e.getClass().getSimpleName() + " after more than 500 calls: " + (depth > 500));
        }
        System.out.println("sum to 1000: " + sumTo(1000) + ", fib(90): " + fib(90, new long[91]));
        List<String> perms = new ArrayList<>();
        permutations("", "abcd", perms);
        System.out.println(perms.size() + " permutations, first " + perms.subList(0, 4) + ", last " + perms.get(perms.size() - 1));
        StringBuilder moves = new StringBuilder();
        System.out.println("hanoi of 10: " + hanoi(10, 'A', 'C', 'B', moves) + " moves; small ones begin " + moves.substring(0, 24));
        System.out.println("palindromes: " + palindrome("racecar") + " " + palindrome("abca") + " " + palindrome(""));
        int[] sorted = {2, 3, 5, 7, 11, 13, 17, 19, 23};
        System.out.println("find 13: " + find(sorted, 13, 0, sorted.length - 1) + ", find 4: " + find(sorted, 4, 0, sorted.length - 1) + ", gcd(1071, 462): " + gcd(1071, 462));
    }

    static void linked() {
        System.out.println("== linked list");
        Chain<String> chain = new Chain<>();
        for (String s : "b c d".split(" ")) {
            chain.addLast(s);
        }
        chain.addFirst("a");
        System.out.println(chain + " size " + chain.size() + " counted " + chain.countRecursively());
        System.out.println("backwards: " + chain.backwards());
        System.out.println("remove c: " + chain.remove("c") + ", remove z: " + chain.remove("z") + " -> " + chain);
        chain.reverse();
        chain.addLast("tail");
        System.out.println("reversed and added: " + chain);
        try {
            chain.valueAfterLast();
        } catch (NullPointerException e) {
            System.out.println("past the end: " + e.getClass().getSimpleName());
        }
        Chain<Integer> stack = new Chain<>();
        for (int i = 1; i <= 4; i++) {
            stack.addFirst(i * i);
        }
        StringBuilder popped = new StringBuilder();
        while (stack.size() > 0) {
            popped.append(stack.removeFirst()).append(' ');
        }
        Chain<Integer> queue = new Chain<>();
        for (int i = 1; i <= 4; i++) {
            queue.addLast(i * 10);
        }
        StringBuilder served = new StringBuilder();
        while (queue.size() > 0) {
            served.append(queue.removeFirst()).append(' ');
        }
        System.out.println("stack pops " + popped.toString().trim() + ", queue serves " + served.toString().trim() + ", empty peek " + queue.peekFirst());
        try {
            queue.removeFirst();
        } catch (java.util.NoSuchElementException e) {
            System.out.println("empty: " + e.getMessage());
        }
        Deque<Character> brackets = new ArrayDeque<>();
        String text = "{[()()]}(";
        boolean ok = true;
        for (char c : text.toCharArray()) {
            switch (c) {
                case '(', '[', '{' -> brackets.push(c);
                default -> {
                    char open = brackets.isEmpty() ? '?' : brackets.pop();
                    ok &= (open == '(' && c == ')') || (open == '[' && c == ']') || (open == '{' && c == '}');
                }
            }
        }
        System.out.println(text + " balanced: " + (ok && brackets.isEmpty()) + ", left open: " + brackets);
    }

    static void trees() {
        System.out.println("== tree");
        Tree tree = new Tree();
        for (int v : new int[] {50, 30, 70, 20, 40, 60, 80, 35, 45, 65, 30}) {
            tree.add(v);
        }
        List<Integer> sorted = new ArrayList<>();
        tree.inOrder(sorted::add);
        System.out.println("in order " + sorted);
        System.out.println("pre order " + tree.preOrder() + "; post order " + tree.postOrder());
        System.out.println("levels " + tree.levels() + "; height " + tree.height() + "; has 65: " + tree.contains(65) + ", has 66: " + tree.contains(66));
        tree.remove(30);
        tree.remove(50);
        tree.remove(99);
        System.out.println("after removing 30 and 50: " + tree.levels() + "; height " + tree.height());
        Tree chain = new Tree();
        for (int v = 1; v <= 800; v++) {
            chain.add(v);
        }
        System.out.println("800 values added in order: height " + chain.height());
    }
}
