package pairs;

/**
 * What happened when a card was flipped. PairsGame.flip returns one of these.
 */
public enum FlipResult {
    /** The card was turned face up as the first card of a turn. */
    FIRST_CARD,
    /** The card was the second of a turn, and it matched the first: both stay face up for good. */
    MATCH,
    /** The card was the second of a turn, and it didn't match: both turn face down at the next flip. */
    NO_MATCH,
    /** Nothing happened: the card was already face up, or the game is over. */
    IGNORED
}
