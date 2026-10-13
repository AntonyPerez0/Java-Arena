package wordstats;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

// Step 1: Words.split.
public class WordsTest {

    @Test
    public void splitsWordsSeparatedBySpaces() {
        assertEquals(List.of("ferry", "leaves", "at", "noon"), Words.split("ferry leaves at noon"));
    }

    @Test
    public void emptyLineHasNoWords() {
        assertEquals(List.of(), Words.split(""));
    }

    @Test
    public void lineOfSpacesAndPunctuationHasNoWords() {
        assertEquals(List.of(), Words.split("   ... !? -- ,; "));
    }

    @Test
    public void oneWordAlone() {
        assertEquals(List.of("anchor"), Words.split("anchor"));
    }

    @Test
    public void manySpacesAndTabsBetweenWordsMakeNoEmptyWords() {
        assertEquals(List.of("low", "tide"), Words.split("  low \t\t  tide   "));
    }

    @Test
    public void punctuationIsNotPartOfAWord() {
        assertEquals(List.of("Rope", "nets", "and", "buoys"), Words.split("Rope, nets (and buoys)!"));
    }

    @Test
    public void keepsUpperAndLowerCaseAsWritten() {
        assertEquals(List.of("The", "HARBOR", "master"), Words.split("The HARBOR master"));
    }

    @Test
    public void digitsArePartOfWords() {
        assertEquals(List.of("pier", "7", "opened", "in", "1987", "B12"), Words.split("pier 7 opened in 1987: B12"));
    }

    @Test
    public void hyphenSeparatesWords() {
        assertEquals(List.of("well", "known", "sea", "wall"), Words.split("well-known sea-wall"));
    }

    @Test
    public void underscoreAndSlashSeparateWords() {
        assertEquals(List.of("north", "south", "east", "west"), Words.split("north_south/east\\west"));
    }

    @Test
    public void apostropheInsideAWordKeepsItOneWord() {
        assertEquals(List.of("don't", "skipper's", "rock'n'roll"), Words.split("don't skipper's rock'n'roll"));
    }

    @Test
    public void apostrophesAtTheStartAndEndAreNotPartOfTheWord() {
        assertEquals(List.of("ahoy", "sailors", "gulls"), Words.split("'ahoy' sailors' ''gulls''"));
    }

    @Test
    public void apostrophesAloneAreNoWord() {
        assertEquals(List.of("a", "b"), Words.split("a ' '' b '"));
    }

    @Test
    public void lettersWithAccentsAreLetters() {
        assertEquals(List.of("café", "naïve", "Ångström"), Words.split("café, naïve Ångström."));
    }

    @Test
    public void lastWordOfTheLineIsIncluded() {
        assertEquals(List.of("tide", "turns"), Words.split("tide turns"));
    }
}
