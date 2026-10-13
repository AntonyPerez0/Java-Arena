package pairs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

// Step 2: the PairsGame constructor, size, symbolAt, isFaceUp, isMatched, pairCount, pairsFound and moves.
public class NewGameTest {

    @Test
    public void knowsItsCards() {
        PairsGame game = new PairsGame(List.of("crab", "snail", "snail", "crab"));
        assertEquals(4, game.size(), "size");
        assertEquals("crab", game.symbolAt(0), "symbolAt(0)");
        assertEquals("snail", game.symbolAt(1), "symbolAt(1)");
        assertEquals("snail", game.symbolAt(2), "symbolAt(2)");
        assertEquals("crab", game.symbolAt(3), "symbolAt(3)");
    }

    @Test
    public void startsWithEveryCardFaceDown() {
        PairsGame game = new PairsGame(List.of("crab", "snail", "urchin", "snail", "crab", "urchin"));
        for (int position = 0; position < 6; position++) {
            assertFalse(game.isFaceUp(position), "card " + position + " should start face down");
            assertFalse(game.isMatched(position), "card " + position + " should start unmatched");
        }
    }

    @Test
    public void startsWithNoMovesAndNoPairsFound() {
        PairsGame game = new PairsGame(List.of("crab", "snail", "urchin", "snail", "crab", "urchin"));
        assertEquals(3, game.pairCount(), "pairCount");
        assertEquals(0, game.pairsFound(), "pairsFound");
        assertEquals(0, game.moves(), "moves");
    }

    @Test
    public void onePairIsAGame() {
        PairsGame game = new PairsGame(List.of("crab", "crab"));
        assertEquals(2, game.size(), "size");
        assertEquals(1, game.pairCount(), "pairCount");
    }

    @Test
    public void theTidePoolDeckMakesAGame() {
        PairsGame game = new PairsGame(Deck.pairs(Deck.TIDE_POOL, new Random(11)));
        assertEquals(16, game.size(), "size");
        assertEquals(8, game.pairCount(), "pairCount");
    }

    @Test
    public void keepsItsOwnCopyOfTheCards() {
        List<String> cards = new ArrayList<>(List.of("crab", "snail", "crab", "snail"));
        PairsGame game = new PairsGame(cards);
        cards.set(0, "urchin");
        cards.clear();
        assertEquals(4, game.size(), "size after the list given to the constructor was cleared");
        assertEquals("crab", game.symbolAt(0), "symbolAt(0) after the list given to the constructor changed");
    }

    @Test
    public void doesNotChangeTheListItIsGiven() {
        List<String> cards = new ArrayList<>(List.of("crab", "snail", "crab", "snail"));
        new PairsGame(cards);
        assertEquals(List.of("crab", "snail", "crab", "snail"), cards, "the list after new PairsGame");
    }

    @Test
    public void refusesNoCards() {
        assertThrows(IllegalArgumentException.class, () -> new PairsGame(List.of()),
                "a game without cards");
    }

    @Test
    public void refusesASymbolOnOneCard() {
        assertThrows(IllegalArgumentException.class, () -> new PairsGame(List.of("crab")),
                "one crab card has no pair");
        assertThrows(IllegalArgumentException.class, () -> new PairsGame(List.of("crab", "snail", "crab")),
                "one snail card has no pair");
    }

    @Test
    public void refusesASymbolOnMoreThanTwoCards() {
        assertThrows(IllegalArgumentException.class,
                () -> new PairsGame(List.of("crab", "crab", "crab", "snail", "snail")),
                "three crab cards");
        assertThrows(IllegalArgumentException.class,
                () -> new PairsGame(List.of("crab", "crab", "crab", "crab")),
                "four crab cards are two pairs that look the same");
    }

    @Test
    public void positionOutsideTheBoardThrows() {
        PairsGame game = new PairsGame(List.of("crab", "crab"));
        assertThrows(IndexOutOfBoundsException.class, () -> game.symbolAt(2), "symbolAt(2) with 2 cards");
        assertThrows(IndexOutOfBoundsException.class, () -> game.symbolAt(-1), "symbolAt(-1)");
    }
}
