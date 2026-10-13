package wordstats;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

// Step 3: TextStats.mostFrequent and TextStats.addAll.
public class MostFrequentTest {

    private static TextStats stats(boolean caseSensitive, String... lines) {
        TextStats stats = new TextStats(caseSensitive);
        for (String line : lines) {
            stats.addLine(line);
        }
        return stats;
    }

    @Test
    public void mostFrequentComeFirst() {
        TextStats stats = stats(false, "oar sail oar mast oar sail");
        assertEquals(
                List.of(new WordCount("oar", 3), new WordCount("sail", 2), new WordCount("mast", 1)),
                stats.mostFrequent(10, 1));
    }

    @Test
    public void keepsOnlyTheFirstN() {
        TextStats stats = stats(false, "oar sail oar mast oar sail");
        assertEquals(List.of(new WordCount("oar", 3), new WordCount("sail", 2)), stats.mostFrequent(2, 1));
        assertEquals(List.of(new WordCount("oar", 3)), stats.mostFrequent(1, 1));
    }

    @Test
    public void sameCountsAreInAlphabeticalOrder() {
        TextStats stats = stats(false, "pike carp eel pike carp eel zander");
        assertEquals(
                List.of(new WordCount("carp", 2), new WordCount("eel", 2), new WordCount("pike", 2), new WordCount("zander", 1)),
                stats.mostFrequent(10, 1));
    }

    @Test
    public void tieAtTheCutKeepsTheAlphabeticallyFirst() {
        TextStats stats = stats(false, "wave kelp shell wave kelp shell rock");
        assertEquals(List.of(new WordCount("kelp", 2), new WordCount("shell", 2)), stats.mostFrequent(2, 1));
    }

    @Test
    public void countsOverSeveralLines() {
        TextStats stats = stats(false, "net", "net boat", "net boat dock");
        assertEquals(
                List.of(new WordCount("net", 3), new WordCount("boat", 2), new WordCount("dock", 1)),
                stats.mostFrequent(5, 1));
    }

    @Test
    public void fewerWordsThanAskedGivesThemAll() {
        TextStats stats = stats(false, "buoy buoy bell");
        assertEquals(List.of(new WordCount("buoy", 2), new WordCount("bell", 1)), stats.mostFrequent(50, 1));
    }

    @Test
    public void noWordsGivesAnEmptyList() {
        assertEquals(List.of(), new TextStats(false).mostFrequent(10, 1), "new stats");
        assertEquals(List.of(), stats(false, "", " ... ").mostFrequent(10, 1), "lines without words");
    }

    @Test
    public void zeroOrLessGivesAnEmptyList() {
        TextStats stats = stats(false, "buoy buoy bell");
        assertEquals(List.of(), stats.mostFrequent(0, 1), "n = 0");
        assertEquals(List.of(), stats.mostFrequent(-1, 1), "n = -1");
    }

    @Test
    public void minLengthLeavesShortWordsOut() {
        TextStats stats = stats(false, "a gull and a tern and a heron");
        assertEquals(
                List.of(new WordCount("gull", 1), new WordCount("heron", 1), new WordCount("tern", 1)),
                stats.mostFrequent(10, 4));
        assertEquals(
                List.of(new WordCount("and", 2), new WordCount("gull", 1), new WordCount("heron", 1), new WordCount("tern", 1)),
                stats.mostFrequent(10, 3),
                "a word exactly minLength characters long stays in");
    }

    @Test
    public void minLengthAppliesBeforeKeepingTheFirstN() {
        TextStats stats = stats(false, "a a a a of of of harbor harbor quay");
        assertEquals(List.of(new WordCount("harbor", 2), new WordCount("quay", 1)), stats.mostFrequent(2, 3));
    }

    @Test
    public void minLengthDoesNotChangeTheOtherCounts() {
        TextStats stats = stats(false, "a a of harbor");
        stats.mostFrequent(10, 5);
        assertEquals(4, stats.wordCount(), "wordCount");
        assertEquals(3, stats.distinctWordCount(), "distinctWordCount");
        assertEquals(2, stats.countOf("a"), "countOf(\"a\")");
    }

    @Test
    public void wordsAreInLowerCaseWhenCaseIsIgnored() {
        TextStats stats = stats(false, "Storm STORM storm Calm");
        assertEquals(List.of(new WordCount("storm", 3), new WordCount("calm", 1)), stats.mostFrequent(10, 1));
    }

    @Test
    public void wordsKeepTheirSpellingWhenCaseSensitive() {
        TextStats stats = stats(true, "Storm storm storm Calm");
        assertEquals(
                List.of(new WordCount("storm", 2), new WordCount("Calm", 1), new WordCount("Storm", 1)),
                stats.mostFrequent(10, 1),
                "upper case letters come before lower case ones in String's compareTo");
    }

    @Test
    public void askingTwiceGivesTheSameAnswer() {
        TextStats stats = stats(false, "oar sail oar");
        List<WordCount> first = stats.mostFrequent(10, 1);
        List<WordCount> second = stats.mostFrequent(10, 1);
        assertEquals(first, second);
        assertEquals(3, stats.wordCount(), "mostFrequent must not change the counts");
    }

    @Test
    public void addAllAddsEverything() {
        TextStats total = stats(false, "net boat", "dock");
        TextStats other = stats(false, "boat boat", "", "quay");
        total.addAll(other);
        assertEquals(5, total.lineCount(), "lineCount");
        assertEquals(8 + 4 + 9 + 0 + 4, total.characterCount(), "characterCount");
        assertEquals(6, total.wordCount(), "wordCount");
        assertEquals(4, total.distinctWordCount(), "distinctWordCount: net, boat, dock, quay");
        assertEquals(3, total.countOf("boat"), "countOf(\"boat\") adds both counts");
        assertEquals(1, total.countOf("quay"), "countOf(\"quay\"), a word only the other one had");
        assertEquals(
                List.of(new WordCount("boat", 3), new WordCount("dock", 1), new WordCount("net", 1), new WordCount("quay", 1)),
                total.mostFrequent(10, 1));
    }

    @Test
    public void addAllDoesNotChangeTheOther() {
        TextStats total = stats(false, "boat");
        TextStats other = stats(false, "boat quay");
        total.addAll(other);
        assertEquals(1, other.lineCount(), "other: lineCount");
        assertEquals(2, other.wordCount(), "other: wordCount");
        assertEquals(1, other.countOf("boat"), "other: countOf(\"boat\")");
        assertEquals(0, other.countOf("dock"), "other: countOf(\"dock\")");
    }

    @Test
    public void addAllIntoEmptyStatsCopiesTheCounts() {
        TextStats total = new TextStats(false);
        total.addAll(stats(false, "Eel eel pike"));
        assertEquals(1, total.lineCount(), "lineCount");
        assertEquals(3, total.wordCount(), "wordCount");
        assertEquals(List.of(new WordCount("eel", 2), new WordCount("pike", 1)), total.mostFrequent(10, 1));
    }

    @Test
    public void addingTwiceCountsTwice() {
        TextStats total = new TextStats(false);
        TextStats other = stats(false, "eel");
        total.addAll(other);
        total.addAll(other);
        assertEquals(2, total.countOf("eel"), "countOf(\"eel\")");
        assertEquals(2, total.lineCount(), "lineCount");
    }
}
