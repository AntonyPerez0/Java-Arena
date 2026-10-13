package pairs;

import java.util.List;
import java.util.Random;

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
        // TODO: Step 1. Check the symbols, put each one twice into a new list, and shuffle the
        //  list with the given random (Collections.shuffle has a version that takes a Random).
        throw new UnsupportedOperationException("Deck.pairs isn't written yet (step 1)");
    }
}
