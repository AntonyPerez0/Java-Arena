import java.util.Optional;

public class Main {
    enum Suit { CLUBS, DIAMONDS, HEARTS, SPADES }

    record Point(int x, int y) {
        double distance() {
            return Math.sqrt(x * x + y * y);
        }
    }

    public static void main(String[] args) {
        System.out.println(Optional.of(5) + " " + Optional.empty() + " " + Optional.ofNullable(null).orElse("default"));
        for (Suit s : Suit.values()) {
            System.out.print(s + ":" + s.ordinal() + " ");
        }
        System.out.println();
        System.out.println(Suit.HEARTS.compareTo(Suit.CLUBS) + " " + Suit.valueOf("SPADES") + " " + Suit.CLUBS.name());
        Point p = new Point(3, 4);
        Point q = new Point(3, 4);
        System.out.println(p + " " + p.distance() + " " + p.equals(q) + " " + (p == q) + " " + (p.hashCode() == q.hashCode()));
        System.out.println(p.x() + p.y());
        Suit suit = Suit.DIAMONDS;
        String color = switch (suit) {
            case HEARTS, DIAMONDS -> "red";
            case CLUBS, SPADES -> "black";
        };
        System.out.println(color);
        Object o = p;
        if (o instanceof Point(int x, int y) && x < y) {
            System.out.println("pattern " + x + "," + y);
        }
        var text = """
                Text block line 1
                  indented line 2
                """;
        System.out.print(text);
    }
}
