package pairs;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

// Step 6: StatusLine.of.
public class StatusLineTest {

    // Positions:   0       1        2       3        4         5
    private static final List<String> CARDS = List.of("crab", "snail", "crab", "urchin", "snail", "urchin");

    @Test
    public void aNewGame() {
        assertEquals("Moves: 0, pairs: 0 of 3", StatusLine.of(new PairsGame(CARDS)));
    }

    @Test
    public void aNewGameWithTheTidePool() {
        PairsGame game = new PairsGame(Deck.pairs(Deck.TIDE_POOL, new Random(9)));
        assertEquals("Moves: 0, pairs: 0 of 8", StatusLine.of(game));
    }

    @Test
    public void countsMovesAndPairsWhileTheGameGoesOn() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        assertEquals("Moves: 1, pairs: 0 of 3", StatusLine.of(game), "after a mismatch");
        game.flip(0);
        game.flip(2);
        assertEquals("Moves: 2, pairs: 1 of 3", StatusLine.of(game), "after a match");
        game.flip(3);
        assertEquals("Moves: 2, pairs: 1 of 3", StatusLine.of(game), "the first card of a turn is not a move");
    }

    @Test
    public void wonGame() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        game.flip(0);
        game.flip(2);
        game.flip(1);
        game.flip(4);
        game.flip(3);
        game.flip(5);
        assertEquals("You found all 3 pairs in 4 moves.", StatusLine.of(game));
    }

    @Test
    public void wonPerfectGameWithTwoPairs() {
        PairsGame game = new PairsGame(List.of("crab", "snail", "snail", "crab"));
        game.flip(0);
        game.flip(3);
        game.flip(1);
        game.flip(2);
        assertEquals("You found all 2 pairs in 2 moves.", StatusLine.of(game));
    }

    @Test
    public void wonGameWithOnePairSaysThePairAndOneMove() {
        PairsGame game = new PairsGame(List.of("crab", "crab"));
        assertEquals("Moves: 0, pairs: 0 of 1", StatusLine.of(game), "before the flips");
        game.flip(0);
        game.flip(1);
        assertEquals("You found the pair in 1 move.", StatusLine.of(game), "one pair, one move: no plural");
    }
}
