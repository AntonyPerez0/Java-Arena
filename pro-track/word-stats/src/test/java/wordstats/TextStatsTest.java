package wordstats;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

// Step 2: counting lines, characters and words in TextStats.
// The tests of mostFrequent and addAll are in MostFrequentTest (step 3).
public class TextStatsTest {

    @Test
    public void newStatsAreAllZero() {
        TextStats stats = new TextStats(false);
        assertEquals(0, stats.lineCount(), "lineCount");
        assertEquals(0, stats.characterCount(), "characterCount");
        assertEquals(0, stats.wordCount(), "wordCount");
        assertEquals(0, stats.distinctWordCount(), "distinctWordCount");
        assertEquals(0, stats.countOf("anything"), "countOf");
    }

    @Test
    public void countsOneLine() {
        TextStats stats = new TextStats(false);
        stats.addLine("Gulls follow the ferry.");
        assertEquals(1, stats.lineCount(), "lineCount");
        assertEquals(23, stats.characterCount(), "characterCount counts every character of the line, spaces and punctuation too");
        assertEquals(4, stats.wordCount(), "wordCount");
        assertEquals(4, stats.distinctWordCount(), "distinctWordCount");
    }

    @Test
    public void countsAddUpOverSeveralLines() {
        TextStats stats = new TextStats(false);
        stats.addLine("the boat");
        stats.addLine("the net and the boat");
        stats.addLine("rain");
        assertEquals(3, stats.lineCount(), "lineCount");
        assertEquals(8 + 20 + 4, stats.characterCount(), "characterCount");
        assertEquals(2 + 5 + 1, stats.wordCount(), "wordCount");
        assertEquals(5, stats.distinctWordCount(), "distinctWordCount: the, boat, net, and, rain");
    }

    @Test
    public void emptyLineCountsAsALineWithNoWords() {
        TextStats stats = new TextStats(false);
        stats.addLine("");
        stats.addLine("");
        assertEquals(2, stats.lineCount(), "lineCount");
        assertEquals(0, stats.characterCount(), "characterCount");
        assertEquals(0, stats.wordCount(), "wordCount");
    }

    @Test
    public void spacesCountAsCharactersButNotAsWords() {
        TextStats stats = new TextStats(false);
        stats.addLine("    ");
        assertEquals(4, stats.characterCount(), "characterCount");
        assertEquals(0, stats.wordCount(), "wordCount");
        assertEquals(0, stats.distinctWordCount(), "distinctWordCount");
    }

    @Test
    public void countsHowManyTimesEachWordAppears() {
        TextStats stats = new TextStats(false);
        stats.addLine("tide in, tide out, tide in");
        assertEquals(3, stats.countOf("tide"), "countOf(\"tide\")");
        assertEquals(2, stats.countOf("in"), "countOf(\"in\")");
        assertEquals(1, stats.countOf("out"), "countOf(\"out\")");
        assertEquals(0, stats.countOf("storm"), "countOf a word that never appeared");
    }

    @Test
    public void ignoresCaseWhenNotCaseSensitive() {
        TextStats stats = new TextStats(false);
        stats.addLine("Tide tide TIDE tIdE");
        assertEquals(4, stats.countOf("tide"), "countOf(\"tide\")");
        assertEquals(4, stats.countOf("Tide"), "countOf(\"Tide\") ignores case too");
        assertEquals(4, stats.countOf("TIDE"), "countOf(\"TIDE\") ignores case too");
        assertEquals(1, stats.distinctWordCount(), "the four spellings are one word");
        assertEquals(4, stats.wordCount(), "wordCount");
    }

    @Test
    public void caseSensitiveStatsKeepSpellingsApart() {
        TextStats stats = new TextStats(true);
        stats.addLine("Tide tide TIDE tide");
        assertEquals(2, stats.countOf("tide"), "countOf(\"tide\")");
        assertEquals(1, stats.countOf("Tide"), "countOf(\"Tide\")");
        assertEquals(1, stats.countOf("TIDE"), "countOf(\"TIDE\")");
        assertEquals(0, stats.countOf("tIdE"), "countOf(\"tIdE\")");
        assertEquals(3, stats.distinctWordCount(), "distinctWordCount");
        assertEquals(4, stats.wordCount(), "wordCount");
    }

    @Test
    public void usesTheWordRulesOfStepOne() {
        TextStats stats = new TextStats(false);
        stats.addLine("'Don't' said the skipper's mate: don't!");
        assertEquals(2, stats.countOf("don't"), "countOf(\"don't\")");
        assertEquals(1, stats.countOf("skipper's"), "countOf(\"skipper's\")");
        assertEquals(6, stats.wordCount(), "wordCount");
    }

    @Test
    public void twoStatsObjectsDoNotShareTheirCounts() {
        TextStats first = new TextStats(false);
        TextStats second = new TextStats(false);
        first.addLine("crab crab");
        second.addLine("eel");
        assertEquals(2, first.countOf("crab"), "first: countOf(\"crab\")");
        assertEquals(0, first.countOf("eel"), "first: countOf(\"eel\")");
        assertEquals(0, second.countOf("crab"), "second: countOf(\"crab\")");
        assertEquals(1, second.lineCount(), "second: lineCount");
    }
}
