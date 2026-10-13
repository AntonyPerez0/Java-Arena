package pairs;

import java.util.List;

/**
 * The rules of a memory game. The cards lie face down at positions 0, 1, 2 and so on. Each turn,
 * the player flips two cards: if they show the same symbol, they stay face up; if not, they turn
 * face down again at the next flip. The game is won when every pair has been found.
 *
 * This class knows nothing about windows or buttons, so the tests can play it without a screen.
 */
public class PairsGame {

    // TODO: Step 2. Add the fields you need: the cards' symbols, which cards are face up and
    //  which are matched, the moves and pairs so far, and what you need to remember between
    //  the two flips of a turn.

    /**
     * A new game with the given cards, all face down. The list isn't changed, and changing it later
     * doesn't change the game.
     *
     * @throws IllegalArgumentException if cards is empty, or if some symbol isn't in it exactly twice
     */
    public PairsGame(List<String> cards) {
        // TODO: Step 2. Check the cards and set up the fields.
    }

    /** How many cards there are. */
    public int size() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("PairsGame.size isn't written yet (step 2)");
    }

    /** The symbol of the card at the position, whether it's face up or not. */
    public String symbolAt(int position) {
        // TODO: Step 2.
        throw new UnsupportedOperationException("PairsGame.symbolAt isn't written yet (step 2)");
    }

    /** Whether the card at the position is face up. Matched cards are face up too. */
    public boolean isFaceUp(int position) {
        // TODO: Step 2.
        throw new UnsupportedOperationException("PairsGame.isFaceUp isn't written yet (step 2)");
    }

    /** Whether the card at the position belongs to a pair that has been found. */
    public boolean isMatched(int position) {
        // TODO: Step 2.
        throw new UnsupportedOperationException("PairsGame.isMatched isn't written yet (step 2)");
    }

    /** How many pairs the game has: half the number of cards. */
    public int pairCount() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("PairsGame.pairCount isn't written yet (step 2)");
    }

    /** How many pairs have been found so far. */
    public int pairsFound() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("PairsGame.pairsFound isn't written yet (step 2)");
    }

    /** How many turns have been completed: one move for every second card flipped. */
    public int moves() {
        // TODO: Step 2.
        throw new UnsupportedOperationException("PairsGame.moves isn't written yet (step 2)");
    }

    /** Whether every pair has been found. */
    public boolean isWon() {
        // TODO: Step 5.
        throw new UnsupportedOperationException("PairsGame.isWon isn't written yet (step 5)");
    }

    /**
     * Flips the card at the position, following the rules in the README (steps 3 to 5), and says
     * what happened.
     *
     * @throws IndexOutOfBoundsException if the position isn't on the board
     */
    public FlipResult flip(int position) {
        // TODO: Steps 3, 4 and 5.
        throw new UnsupportedOperationException("PairsGame.flip isn't written yet (step 3)");
    }
}
