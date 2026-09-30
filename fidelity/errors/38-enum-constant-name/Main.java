public class Main {
    public static void main(String[] args) {
        Suit trump = HEARTS;
        if (trump == SPADES) {
            System.out.println("spades");
        }
        switch (trump) {
            case HEARTS:
                System.out.println("hearts");
                break;
            default:
                System.out.println("other");
        }
        Suit chosen = "CLUBS";
        System.out.println(Suit.HEART);
        Card card = new Card(DIAMONDS, 5);
    }
}

enum Suit {
    HEARTS, SPADES, CLUBS, DIAMONDS
}

class Card {
    public Card(Suit suit, int value) {
    }
}
