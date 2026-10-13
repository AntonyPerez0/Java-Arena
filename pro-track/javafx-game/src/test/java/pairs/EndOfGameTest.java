package pairs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

// Step 5: PairsGame.isWon, and flips once the game is won.
public class EndOfGameTest {

    // Positions:   0       1        2       3        4         5
    private static final List<String> CARDS = List.of("crab", "snail", "crab", "urchin", "snail", "urchin");

    @Test
    public void aNewGameIsNotWon() {
        assertFalse(new PairsGame(CARDS).isWon(), "a new game with 3 pairs");
        assertFalse(new PairsGame(List.of("crab", "crab")).isWon(), "a new game with 1 pair");
    }

    @Test
    public void notWonWhileAPairIsLeft() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        game.flip(1);
        game.flip(4);
        assertFalse(game.isWon(), "2 of 3 pairs found");
        game.flip(3);
        assertFalse(game.isWon(), "the last pair's first card is face up, but the pair isn't found yet");
    }

    @Test
    public void wonWhenEveryPairIsFound() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        game.flip(1);
        game.flip(4);
        game.flip(3);
        assertEquals(FlipResult.MATCH, game.flip(5), "the last pair");
        assertTrue(game.isWon(), "all 3 pairs found");
        assertEquals(3, game.pairsFound(), "pairsFound");
        assertEquals(3, game.moves(), "moves: a perfect game takes one move for each pair");
    }

    @Test
    public void onePairGameIsWonWithOneMove() {
        PairsGame game = new PairsGame(List.of("crab", "crab"));
        game.flip(1);
        assertFalse(game.isWon(), "one card face up");
        assertEquals(FlipResult.MATCH, game.flip(0), "the only pair");
        assertTrue(game.isWon(), "the only pair found");
        assertEquals(1, game.moves(), "moves");
    }

    @Test
    public void everyCardIsFaceUpAndMatchedAtTheEnd() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        game.flip(0);
        game.flip(2);
        game.flip(1);
        game.flip(4);
        game.flip(3);
        game.flip(5);
        for (int position = 0; position < CARDS.size(); position++) {
            assertTrue(game.isFaceUp(position), "card " + position + " should be face up at the end");
            assertTrue(game.isMatched(position), "card " + position + " should be matched at the end");
        }
    }

    @Test
    public void countsTheMovesOfAGameWithMistakes() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        game.flip(3);
        game.flip(2);
        game.flip(0);
        game.flip(2);
        game.flip(4);
        game.flip(1);
        game.flip(3);
        game.flip(5);
        assertTrue(game.isWon(), "all pairs found");
        assertEquals(5, game.moves(), "2 turns without a match and 3 with one");
    }

    @Test
    public void flipsAfterTheGameIsWonAreIgnored() {
        PairsGame game = new PairsGame(List.of("crab", "snail", "snail", "crab"));
        game.flip(0);
        game.flip(3);
        game.flip(1);
        game.flip(2);
        assertTrue(game.isWon(), "both pairs found");
        for (int position = 0; position < 4; position++) {
            assertEquals(FlipResult.IGNORED, game.flip(position), "flip(" + position + ") after the game is won");
        }
        assertEquals(2, game.moves(), "moves don't change after the game is won");
        assertEquals(2, game.pairsFound(), "pairsFound doesn't change after the game is won");
        assertTrue(game.isWon(), "the game stays won");
        assertTrue(game.isFaceUp(0) && game.isMatched(0), "the cards stay face up and matched");
    }

    @Test
    public void aShuffledDeckCanBePlayedToTheEnd() {
        PairsGame game = new PairsGame(Deck.pairs(Deck.TIDE_POOL, new Random(2024)));
        // Play like a player with a perfect memory: find each card's partner and flip the two.
        Map<String, Integer> firstPositionOf = new HashMap<>();
        for (int position = 0; position < game.size(); position++) {
            String symbol = game.symbolAt(position);
            if (firstPositionOf.containsKey(symbol)) {
                game.flip(firstPositionOf.get(symbol));
                assertEquals(FlipResult.MATCH, game.flip(position),
                        "flipping both " + symbol + " cards should be a match");
            } else {
                firstPositionOf.put(symbol, position);
            }
        }
        assertTrue(game.isWon(), "all pairs found");
        assertEquals(8, game.moves(), "a perfect game with 8 pairs takes 8 moves");
    }
}
