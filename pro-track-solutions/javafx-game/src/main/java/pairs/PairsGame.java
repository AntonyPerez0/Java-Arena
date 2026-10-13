package pairs;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The rules of a memory game. The cards lie face down at positions 0, 1, 2 and so on. Each turn,
 * the player flips two cards: if they show the same symbol, they stay face up; if not, they turn
 * face down again at the next flip. The game is won when every pair has been found.
 *
 * This class knows nothing about windows or buttons, so the tests can play it without a screen.
 */
public class PairsGame {

    /** Means "no card" in firstCard and the two mismatch fields. */
    private static final int NONE = -1;

    private final List<String> symbols;
    private final boolean[] faceUp;
    private final boolean[] matched;
    private int moves;
    private int pairsFound;
    /** The first card of the turn that's going on, or NONE between turns. */
    private int firstCard = NONE;
    /** The two cards of the last turn when they didn't match, until the next flip hides them. */
    private int mismatchA = NONE;
    private int mismatchB = NONE;

    /**
     * A new game with the given cards, all face down. The list isn't changed, and changing it later
     * doesn't change the game.
     *
     * @throws IllegalArgumentException if cards is empty, or if some symbol isn't in it exactly twice
     */
    public PairsGame(List<String> cards) {
        if (cards.isEmpty()) {
            throw new IllegalArgumentException("a game needs at least one pair of cards");
        }
        Map<String, Integer> counts = new HashMap<>();
        for (String card : cards) {
            counts.put(card, counts.getOrDefault(card, 0) + 1);
        }
        for (String symbol : counts.keySet()) {
            int count = counts.get(symbol);
            if (count != 2) {
                throw new IllegalArgumentException(
                        "every symbol must be on exactly two cards, but " + symbol + " is on " + count);
            }
        }
        this.symbols = new ArrayList<>(cards);
        this.faceUp = new boolean[cards.size()];
        this.matched = new boolean[cards.size()];
    }

    /** How many cards there are. */
    public int size() {
        return symbols.size();
    }

    /** The symbol of the card at the position, whether it's face up or not. */
    public String symbolAt(int position) {
        return symbols.get(position);
    }

    /** Whether the card at the position is face up. Matched cards are face up too. */
    public boolean isFaceUp(int position) {
        return faceUp[position];
    }

    /** Whether the card at the position belongs to a pair that has been found. */
    public boolean isMatched(int position) {
        return matched[position];
    }

    /** How many pairs the game has: half the number of cards. */
    public int pairCount() {
        return symbols.size() / 2;
    }

    /** How many pairs have been found so far. */
    public int pairsFound() {
        return pairsFound;
    }

    /** How many turns have been completed: one move for every second card flipped. */
    public int moves() {
        return moves;
    }

    /** Whether every pair has been found. */
    public boolean isWon() {
        return pairsFound == pairCount();
    }

    /**
     * Flips the card at the position, following the rules in the README (steps 3 to 5), and says
     * what happened.
     *
     * @throws IndexOutOfBoundsException if the position isn't on the board
     */
    public FlipResult flip(int position) {
        if (position < 0 || position >= size()) {
            throw new IndexOutOfBoundsException("there is no card at position " + position);
        }
        if (isWon()) {
            return FlipResult.IGNORED;
        }
        if (mismatchA != NONE) {
            faceUp[mismatchA] = false;
            faceUp[mismatchB] = false;
            mismatchA = NONE;
            mismatchB = NONE;
        }
        if (faceUp[position]) {
            return FlipResult.IGNORED;
        }
        faceUp[position] = true;
        if (firstCard == NONE) {
            firstCard = position;
            return FlipResult.FIRST_CARD;
        }

        int first = firstCard;
        firstCard = NONE;
        moves++;
        if (symbols.get(first).equals(symbols.get(position))) {
            matched[first] = true;
            matched[position] = true;
            pairsFound++;
            return FlipResult.MATCH;
        }
        mismatchA = first;
        mismatchB = position;
        return FlipResult.NO_MATCH;
    }
}
