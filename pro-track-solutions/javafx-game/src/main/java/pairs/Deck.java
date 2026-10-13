package pairs;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Makes the cards for a game: every symbol twice, in a shuffled order.
 */
public class Deck {

    /** The eight symbols of the game in the window: 8 pairs, 16 cards, a 4 by 4 board. */
    public static final List<String> TIDE_POOL = List.of(
            "crab", "starfish", "urchin", "shrimp", "snail", "anemone", "mussel", "limpet");

    /**
     * The cards for a game: each of the symbols twice, shuffled with the given Random, so the same
     * seed always gives the same order. Doesn't change symbols.
     *
     * @throws IllegalArgumentException if symbols is empty or has the same symbol more than once
     */
    public static List<String> pairs(List<String> symbols, Random random) {
        if (symbols.isEmpty()) {
            throw new IllegalArgumentException("a game needs at least one symbol");
        }
        Set<String> seen = new HashSet<>();
        List<String> cards = new ArrayList<>();
        for (String symbol : symbols) {
            if (!seen.add(symbol)) {
                throw new IllegalArgumentException("the symbol " + symbol + " is in the list twice");
            }
            cards.add(symbol);
            cards.add(symbol);
        }
        Collections.shuffle(cards, random);
        return cards;
    }
}
