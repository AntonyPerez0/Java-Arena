package pairs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

// Step 4: PairsGame.flip, two cards that don't match.
public class MismatchTest {

    // Positions:   0       1        2       3        4         5
    private static final List<String> CARDS = List.of("crab", "snail", "crab", "urchin", "snail", "urchin");

    @Test
    public void twoDifferentCardsDoNotMatch() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        assertEquals(FlipResult.NO_MATCH, game.flip(1), "flip(1) after flip(0): crab and snail");
        assertFalse(game.isMatched(0), "card 0 isn't matched");
        assertFalse(game.isMatched(1), "card 1 isn't matched");
    }

    @Test
    public void bothCardsStayFaceUpUntilTheNextFlip() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        assertTrue(game.isFaceUp(0), "card 0 stays face up, so the player can see it");
        assertTrue(game.isFaceUp(1), "card 1 stays face up, so the player can see it");
    }

    @Test
    public void aMismatchIsAMoveButNoPair() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        assertEquals(1, game.moves(), "moves after one turn");
        assertEquals(0, game.pairsFound(), "pairsFound after a mismatch");
    }

    @Test
    public void theNextFlipTurnsThemFaceDown() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        assertEquals(FlipResult.FIRST_CARD, game.flip(3), "the flip after a mismatch starts a new turn");
        assertFalse(game.isFaceUp(0), "card 0 should be face down again");
        assertFalse(game.isFaceUp(1), "card 1 should be face down again");
        assertTrue(game.isFaceUp(3), "card 3 was just flipped");
    }

    @Test
    public void flippingOneOfTheShownCardsStartsATurnWithIt() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(1);
        assertEquals(FlipResult.FIRST_CARD, game.flip(1),
                "card 1 is turned face down with card 0, then flipped again as the first card of a new turn");
        assertTrue(game.isFaceUp(1), "card 1 is face up as the new turn's first card");
        assertFalse(game.isFaceUp(0), "card 0 should be face down again");
        assertEquals(FlipResult.MATCH, game.flip(4), "card 4 is the other snail");
    }

    @Test
    public void flippingAMatchedCardStillHidesTheMismatch() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        game.flip(1);
        game.flip(3);
        assertEquals(FlipResult.IGNORED, game.flip(0), "card 0 is matched");
        assertFalse(game.isFaceUp(1), "card 1 should be face down: any flip hides the last mismatch first");
        assertFalse(game.isFaceUp(3), "card 3 should be face down: any flip hides the last mismatch first");
        assertEquals(FlipResult.FIRST_CARD, game.flip(5), "the next flip starts a new turn");
    }

    @Test
    public void matchedCardsStayFaceUpAfterAMismatch() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        game.flip(1);
        game.flip(3);
        game.flip(4);
        assertTrue(game.isFaceUp(0) && game.isFaceUp(2), "the crab pair was found, so it stays face up");
        assertTrue(game.isMatched(0) && game.isMatched(2), "the crab pair stays matched");
    }

    @Test
    public void aCardSeenInAMismatchCanBeMatchedLater() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(1);
        assertEquals(FlipResult.NO_MATCH, game.flip(3), "snail and urchin");
        game.flip(5);
        assertEquals(FlipResult.MATCH, game.flip(3), "the player remembers where the other urchin was");
        assertEquals(2, game.moves(), "moves");
        assertEquals(1, game.pairsFound(), "pairsFound");
    }

    @Test
    public void severalMismatchesInARow() {
        PairsGame game = new PairsGame(CARDS);
        assertEquals(FlipResult.FIRST_CARD, game.flip(0), "turn 1, first card");
        assertEquals(FlipResult.NO_MATCH, game.flip(1), "turn 1, crab and snail");
        assertEquals(FlipResult.FIRST_CARD, game.flip(2), "turn 2, first card");
        assertEquals(FlipResult.NO_MATCH, game.flip(3), "turn 2, crab and urchin");
        assertEquals(FlipResult.FIRST_CARD, game.flip(4), "turn 3, first card");
        assertEquals(FlipResult.NO_MATCH, game.flip(5), "turn 3, snail and urchin");
        assertEquals(3, game.moves(), "moves after three turns");
        assertEquals(0, game.pairsFound(), "pairsFound");
        for (int position = 0; position < 4; position++) {
            assertFalse(game.isFaceUp(position), "card " + position + " should be face down again");
        }
        assertTrue(game.isFaceUp(4) && game.isFaceUp(5), "the last turn's two cards are still shown");
    }
}
