public class Main {
    public static void main(String[] args) {
        Suit suit = new Suit();
        Color color = new Color("red");
        System.out.println(suit + " " + color);
    }
}

enum Suit {
    HEARTS, SPADES, CLUBS, DIAMONDS
}

enum Color {
    RED("r"), GREEN("g");

    private String code;

    public Color(String code) {
        this.code = code;
    }
}
