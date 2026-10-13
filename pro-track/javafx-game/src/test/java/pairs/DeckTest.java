package pairs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

// Step 1: Deck.pairs.
public class DeckTest {

    private static final List<String> SYMBOLS = List.of("kelp", "pebble", "shell", "gull", "sand", "foam");

    /** How many times each card is in the list. */
    private static Map<String, Integer> counts(List<String> cards) {
        Map<String, Integer> counts = new HashMap<>();
        for (String card : cards) {
            counts.put(card, counts.getOrDefault(card, 0) + 1);
        }
        return counts;
    }

    @Test
    public void hasTwoCardsForEachSymbol() {
        List<String> cards = Deck.pairs(SYMBOLS, new Random(7));
        assertEquals(12, cards.size(), "6 symbols give 12 cards");
        Map<String, Integer> expected = new HashMap<>();
        for (String symbol : SYMBOLS) {
            expected.put(symbol, 2);
        }
        assertEquals(expected, counts(cards), "how many times each symbol is in " + cards);
    }

    @Test
    public void oneSymbolGivesOnePair() {
        assertEquals(List.of("tide", "tide"), Deck.pairs(List.of("tide"), new Random(1)));
    }

    @Test
    public void theTidePoolMakesSixteenCards() {
        List<String> cards = Deck.pairs(Deck.TIDE_POOL, new Random(3));
        assertEquals(16, cards.size(), "8 symbols give 16 cards");
        assertEquals(new HashSet<>(Deck.TIDE_POOL), new HashSet<>(cards), "the symbols on the cards");
    }

    @Test
    public void sameSeedGivesTheSameOrder() {
        assertEquals(Deck.pairs(SYMBOLS, new Random(42)), Deck.pairs(SYMBOLS, new Random(42)),
                "two decks shuffled with new Random(42) should be in the same order: use the Random you are given");
    }

    @Test
    public void cardsAreShuffled() {
        List<String> inOrder = new ArrayList<>();
        for (String symbol : SYMBOLS) {
            inOrder.add(symbol);
            inOrder.add(symbol);
        }
        Set<List<String>> orders = new HashSet<>();
        for (int seed = 0; seed < 20; seed++) {
            orders.add(Deck.pairs(SYMBOLS, new Random(seed)));
        }
        assertTrue(orders.size() > 1, "20 different seeds should give more than one order of the cards");
        orders.remove(inOrder);
        assertFalse(orders.isEmpty(), "the cards should be shuffled, not left in the order of the symbols");
    }

    @Test
    public void differentSeedsGiveDifferentOrders() {
        assertNotEquals(Deck.pairs(Deck.TIDE_POOL, new Random(1)), Deck.pairs(Deck.TIDE_POOL, new Random(2)),
                "new Random(1) and new Random(2) should shuffle 16 cards differently");
    }

    @Test
    public void doesNotChangeTheSymbols() {
        List<String> symbols = new ArrayList<>(List.of("kelp", "shell", "gull"));
        Deck.pairs(symbols, new Random(5));
        assertEquals(List.of("kelp", "shell", "gull"), symbols, "the list of symbols after Deck.pairs");
    }

    @Test
    public void refusesNoSymbols() {
        assertThrows(IllegalArgumentException.class, () -> Deck.pairs(List.of(), new Random(1)),
                "a deck needs at least one symbol");
    }

    @Test
    public void refusesASymbolGivenTwice() {
        assertThrows(IllegalArgumentException.class,
                () -> Deck.pairs(List.of("kelp", "shell", "kelp"), new Random(1)),
                "kelp twice would make four kelp cards");
    }
}
