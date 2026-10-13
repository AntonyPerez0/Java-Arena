package pairs;

/**
 * The line of text under the board that tells the player how the game is going.
 */
public class StatusLine {

    /**
     * The status of the game: "Moves: 3, pairs: 2 of 8" while it goes on, and "You found all 8
     * pairs in 14 moves." when it's won. The README's step 6 has the details.
     */
    public static String of(PairsGame game) {
        if (!game.isWon()) {
            return "Moves: " + game.moves() + ", pairs: " + game.pairsFound() + " of " + game.pairCount();
        }
        String moves = game.moves() == 1 ? "1 move" : game.moves() + " moves";
        if (game.pairCount() == 1) {
            return "You found the pair in " + moves + ".";
        }
        return "You found all " + game.pairCount() + " pairs in " + moves + ".";
    }
}
