package pairs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

// Step 3: PairsGame.flip, the first card of a turn and a match.
public class FlipTest {

    // Positions:   0       1        2       3        4         5
    private static final List<String> CARDS = List.of("crab", "snail", "crab", "urchin", "snail", "urchin");

    @Test
    public void firstFlipTurnsTheCardFaceUp() {
        PairsGame game = new PairsGame(CARDS);
        assertEquals(FlipResult.FIRST_CARD, game.flip(1), "flip(1) on a new game");
        assertTrue(game.isFaceUp(1), "card 1 should be face up after flip(1)");
        assertFalse(game.isMatched(1), "card 1 isn't matched yet");
    }

    @Test
    public void firstFlipLeavesTheOtherCardsFaceDown() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(1);
        for (int position = 0; position < CARDS.size(); position++) {
            if (position != 1) {
                assertFalse(game.isFaceUp(position), "card " + position + " should still be face down");
            }
        }
    }

    @Test
    public void firstFlipIsNotAMove() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(3);
        assertEquals(0, game.moves(), "moves after one card of the first turn");
        assertEquals(0, game.pairsFound(), "pairsFound after one card");
    }

    @Test
    public void twoCardsWithTheSameSymbolMatch() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        assertEquals(FlipResult.MATCH, game.flip(2), "flip(2) after flip(0): both are crab");
        assertTrue(game.isFaceUp(0) && game.isFaceUp(2), "a found pair stays face up");
        assertTrue(game.isMatched(0), "card 0 should be matched");
        assertTrue(game.isMatched(2), "card 2 should be matched");
        assertFalse(game.isMatched(1), "card 1 wasn't flipped");
    }

    @Test
    public void aMatchCountsAMoveAndAPair() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        assertEquals(1, game.moves(), "moves after one turn");
        assertEquals(1, game.pairsFound(), "pairsFound after one match");
    }

    @Test
    public void theOrderOfTheTwoCardsDoesNotMatter() {
        PairsGame game = new PairsGame(CARDS);
        assertEquals(FlipResult.FIRST_CARD, game.flip(5), "flip(5)");
        assertEquals(FlipResult.MATCH, game.flip(3), "flip(3) after flip(5): both are urchin");
        assertTrue(game.isMatched(3) && game.isMatched(5), "cards 3 and 5 should be matched");
    }

    @Test
    public void aMatchEndsTheTurn() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        assertEquals(FlipResult.FIRST_CARD, game.flip(1), "the flip after a match starts a new turn");
        assertEquals(FlipResult.MATCH, game.flip(4), "flip(4) after flip(1): both are snail");
        assertEquals(2, game.moves(), "moves after two turns");
        assertEquals(2, game.pairsFound(), "pairsFound after two matches");
    }

    @Test
    public void flippingTheFirstCardAgainIsIgnored() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        assertEquals(FlipResult.IGNORED, game.flip(0), "flip(0) twice in a row: the card is already face up");
        assertTrue(game.isFaceUp(0), "card 0 stays face up");
        assertEquals(0, game.moves(), "an ignored flip is not a move");
        assertEquals(FlipResult.MATCH, game.flip(2), "the turn goes on: flip(2) is still its second card");
    }

    @Test
    public void flippingAMatchedCardIsIgnored() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        assertEquals(FlipResult.IGNORED, game.flip(0), "card 0 is matched");
        assertEquals(FlipResult.IGNORED, game.flip(2), "card 2 is matched");
        assertTrue(game.isFaceUp(0) && game.isMatched(0), "card 0 stays face up and matched");
        assertEquals(1, game.moves(), "ignored flips are not moves");
        assertEquals(FlipResult.FIRST_CARD, game.flip(3), "the next real flip starts a turn");
    }

    @Test
    public void flippingAMatchedCardInTheMiddleOfATurnIsIgnored() {
        PairsGame game = new PairsGame(CARDS);
        game.flip(0);
        game.flip(2);
        game.flip(3);
        assertEquals(FlipResult.IGNORED, game.flip(2), "card 2 is matched");
        assertEquals(FlipResult.MATCH, game.flip(5), "the turn that began with card 3 goes on");
    }

    @Test
    public void flippingOutsideTheBoardThrows() {
        PairsGame game = new PairsGame(CARDS);
        assertThrows(IndexOutOfBoundsException.class, () -> game.flip(-1), "flip(-1)");
        assertThrows(IndexOutOfBoundsException.class, () -> game.flip(6), "flip(6) with 6 cards");
    }

    @Test
    public void equalSymbolsThatAreDifferentObjectsMatch() {
        PairsGame game = new PairsGame(List.of(new String("crab"), "snail", "crab", new String("snail")));
        game.flip(0);
        assertEquals(FlipResult.MATCH, game.flip(2),
                "crab and crab are equal strings but different objects: compare with equals");
    }
}
