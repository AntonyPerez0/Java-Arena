package yarnstash;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.Test;

// Step 3: list and search.
public class ListAndSearchTest {

    private static YarnDao stashWithFiveYarns() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Moonlight merino", "Knit Nook", 1);
        dao.add("Gray alpaca", "Market stall", 2);
        dao.add("Granny's merino", "Knit Nook", 1);
        dao.add("Cotton bloom", "Market stall", 6);
        dao.add("MERINO (no label)", "Knit Nook", 3);
        return dao;
    }

    @Test
    public void emptyStashListsNothing() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertEquals(List.of(), dao.list());
    }

    @Test
    public void oneYarn() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Mohair", "Gift", 1);
        assertEquals(List.of(new Yarn(1, "Mohair", "Gift", 1)), dao.list());
    }

    @Test
    public void listHasEveryYarnInTheOrderOfTheIds() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(List.of(
                new Yarn(1, "Moonlight merino", "Knit Nook", 1),
                new Yarn(2, "Gray alpaca", "Market stall", 2),
                new Yarn(3, "Granny's merino", "Knit Nook", 1),
                new Yarn(4, "Cotton bloom", "Market stall", 6),
                new Yarn(5, "MERINO (no label)", "Knit Nook", 3)), dao.list());
    }

    @Test
    public void listAndSearchAreInIdOrderEvenWhenTheRowsWereAddedInAnotherOrder() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        // Without its primary key, H2 keeps the rows in the order they were added, so a SELECT
        // without ORDER BY would give 30, 10, 20 here.
        TestDatabase.execute(url, "ALTER TABLE Yarn DROP PRIMARY KEY");
        TestDatabase.execute(url, "INSERT INTO Yarn (id, name, shop, skeins) VALUES (30, 'Chunky wool', 'Yarn swap', 12)");
        TestDatabase.execute(url, "INSERT INTO Yarn (id, name, shop, skeins) VALUES (10, 'Wool tweed', 'Yarn swap', 4)");
        TestDatabase.execute(url, "INSERT INTO Yarn (id, name, shop, skeins) VALUES (20, 'Linen', 'Yarn swap', 2)");
        assertEquals(List.of(
                new Yarn(10, "Wool tweed", "Yarn swap", 4),
                new Yarn(20, "Linen", "Yarn swap", 2),
                new Yarn(30, "Chunky wool", "Yarn swap", 12)), dao.list(), "list(): use ORDER BY id");
        assertEquals(List.of(
                new Yarn(10, "Wool tweed", "Yarn swap", 4),
                new Yarn(30, "Chunky wool", "Yarn swap", 12)), dao.search("wool"), "search(): use ORDER BY id");
    }

    @Test
    public void listSeesWhatAnotherDaoAddedLater() {
        String url = TestDatabase.freshUrl();
        YarnDao first = new JdbcYarnDao(url);
        YarnDao second = new JdbcYarnDao(url);
        first.add("Sock yarn", "Knit Nook", 8);
        second.add("Hemp", "Online shop", 3);
        List<Yarn> expected = List.of(
                new Yarn(1, "Sock yarn", "Knit Nook", 8),
                new Yarn(2, "Hemp", "Online shop", 3));
        assertEquals(expected, first.list(), "both DAOs use the same database, so they list the same yarn");
        assertEquals(expected, second.list(), "both DAOs use the same database, so they list the same yarn");
    }

    @Test
    public void changingTheReturnedListChangesNothingInTheStash() {
        YarnDao dao = stashWithFiveYarns();
        try {
            dao.list().clear();
        } catch (UnsupportedOperationException e) {
            // A list that can't be changed is fine too.
        }
        assertEquals(5, dao.list().size(), "list() should not hand out a list the DAO keeps");
    }

    @Test
    public void searchFindsNamesThatContainTheText() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(List.of(new Yarn(2, "Gray alpaca", "Market stall", 2)), dao.search("alpaca"));
    }

    @Test
    public void searchIgnoresUpperAndLowerCaseInOrder() {
        YarnDao dao = stashWithFiveYarns();
        List<Yarn> merinos = List.of(
                new Yarn(1, "Moonlight merino", "Knit Nook", 1),
                new Yarn(3, "Granny's merino", "Knit Nook", 1),
                new Yarn(5, "MERINO (no label)", "Knit Nook", 3));
        assertEquals(merinos, dao.search("merino"));
        assertEquals(merinos, dao.search("Merino"));
        assertEquals(merinos, dao.search("mERiNo"));
    }

    @Test
    public void searchFindsTextInTheMiddleOfAWord() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(List.of(
                new Yarn(1, "Moonlight merino", "Knit Nook", 1),
                new Yarn(4, "Cotton bloom", "Market stall", 6)), dao.search("oo"), "oo is inside Moonlight and bloom");
    }

    @Test
    public void searchLooksOnlyAtTheNameNotTheShop() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(List.of(), dao.search("Market stall"), "Market stall is a shop, not a name");
    }

    @Test
    public void searchWithNoMatchFindsNothing() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(List.of(), dao.search("cashmere"));
    }

    @Test
    public void searchInAnEmptyStashFindsNothing() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertEquals(List.of(), dao.search("alpaca"));
    }

    @Test
    public void searchWithEmptyTextFindsEveryYarn() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(dao.list(), dao.search(""));
    }

    @Test
    public void searchWithAQuoteWorks() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(List.of(new Yarn(3, "Granny's merino", "Knit Nook", 1)), dao.search("granny's"),
                "use a ? parameter, so the ' can't break the SQL");
    }

    @Test
    public void searchWithSqlInTheTextFindsNothing() {
        YarnDao dao = stashWithFiveYarns();
        assertEquals(List.of(), dao.search("x' OR 'a'='a"), "the text is a value, never part of the SQL");
        assertEquals(List.of(), dao.search("%' OR 1=1 --"), "the text is a value, never part of the SQL");
        assertEquals(5, dao.list().size());
    }

    @Test
    public void searchTreatsPercentAndUnderscoreAsPlainText() {
        YarnDao dao = stashWithFiveYarns();
        String why = "no name has this text in it (with LIKE, % and _ are wildcards: see README.md, step 3)";
        assertEquals(List.of(), dao.search("%"), why);
        assertEquals(List.of(), dao.search("_"), why);
        assertEquals(List.of(), dao.search("m_rino"), why);
        assertEquals(List.of(), dao.search("\\"), why);
        int percent = dao.add("Sock yarn, 75% wool", "Knit Nook", 2);
        int underscore = dao.add("Tweed_lot_7", "Yarn swap", 1);
        assertEquals(List.of(new Yarn(percent, "Sock yarn, 75% wool", "Knit Nook", 2)), dao.search("75%"));
        assertEquals(List.of(new Yarn(underscore, "Tweed_lot_7", "Yarn swap", 1)), dao.search("_lot_"));
    }
}
