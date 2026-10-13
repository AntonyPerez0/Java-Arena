package yarnstash;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;

// Step 2: add and findById.
public class AddAndFindTest {

    @Test
    public void firstYarnGetsId1AndTheNextOnesCountUp() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertEquals(1, dao.add("Gray alpaca", "Knit Nook", 2), "id of the first yarn");
        assertEquals(2, dao.add("Cotton bloom", "Knit Nook", 6), "id of the second yarn");
        assertEquals(3, dao.add("Sock yarn", "Market stall", 1), "id of the third yarn");
    }

    @Test
    public void addedYarnIsInTheTable() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        int id = dao.add("Silk blend", "Online shop", 3);
        assertEquals(1, TestDatabase.rows(url), "add should insert one row");
        assertEquals("Silk blend", TestDatabase.text(url, "SELECT name FROM Yarn WHERE id = " + id));
        assertEquals("Online shop", TestDatabase.text(url, "SELECT shop FROM Yarn WHERE id = " + id));
        assertEquals(3, TestDatabase.number(url, "SELECT skeins FROM Yarn WHERE id = " + id));
    }

    @Test
    public void findByIdReturnsWhatWasAdded() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Gray alpaca", "Knit Nook", 2);
        int id = dao.add("Mohair", "Gift", 1);
        dao.add("Cotton bloom", "Knit Nook", 6);
        assertEquals(new Yarn(id, "Mohair", "Gift", 1), dao.findById(id));
    }

    @Test
    public void findByIdOfAMissingIdReturnsNull() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertNull(dao.findById(1), "the stash is empty");
        dao.add("Linen", "Market stall", 1);
        assertNull(dao.findById(2), "there's no yarn 2");
        assertNull(dao.findById(0), "there's no yarn 0");
        assertNull(dao.findById(-1), "there's no yarn -1");
    }

    @Test
    public void findByIdFindsARowAddedWithoutTheDao() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Bamboo blend', 'Online shop', 4)");
        assertEquals(new Yarn(1, "Bamboo blend", "Online shop", 4), dao.findById(1),
                "findById should read from the database, not from a list in the DAO");
    }

    @Test
    public void anotherDaoOnTheSameDatabaseFindsTheYarn() {
        String url = TestDatabase.freshUrl();
        int id = new JdbcYarnDao(url).add("Chunky wool", "Knit Nook", 1);
        YarnDao later = new JdbcYarnDao(url);
        assertEquals(new Yarn(id, "Chunky wool", "Knit Nook", 1), later.findById(id));
    }

    @Test
    public void spacesAtTheStartAndEndAreDropped() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        int id = dao.add("  Lace weight ", "\tKnit Nook  ", 2);
        assertEquals(new Yarn(id, "Lace weight", "Knit Nook", 2), dao.findById(id));
    }

    @Test
    public void spacesInsideTheTextStay() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        int id = dao.add("Super  bulky wool", "Yarn  swap", 2);
        assertEquals(new Yarn(id, "Super  bulky wool", "Yarn  swap", 2), dao.findById(id));
    }

    @Test
    public void textWithQuotesIsStoredAsItIs() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        int id = dao.add("Granny's merino", "Shelf \"B\"; top row", 1);
        assertEquals(new Yarn(id, "Granny's merino", "Shelf \"B\"; top row", 1), dao.findById(id),
                "use ? parameters and setString, so a ' in the text can't break the SQL");
    }

    @Test
    public void textThatLooksLikeSqlIsJustText() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        dao.add("Linen", "Market stall", 1);
        int id = dao.add("x'); DELETE FROM Yarn; --", "Market stall", 1);
        assertEquals(2, TestDatabase.rows(url), "both yarns should still be there");
        assertEquals("x'); DELETE FROM Yarn; --", dao.findById(id).getName());
    }

    @Test
    public void lettersWithAccentsAreKept() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        int id = dao.add("Laine mérinos grisée", "Strickstübchen", 1);
        assertEquals(new Yarn(id, "Laine mérinos grisée", "Strickstübchen", 1), dao.findById(id));
    }

    @Test
    public void manySkeinsAreFine() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        int id = dao.add("Cotton cones", "Mill outlet", 25000);
        assertEquals(25000, dao.findById(id).getSkeins());
    }

    @Test
    public void emptyNameIsRefused() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        assertThrows(IllegalArgumentException.class, () -> dao.add("", "Knit Nook", 1));
        assertThrows(IllegalArgumentException.class, () -> dao.add("   ", "Knit Nook", 1), "only spaces is empty too");
        assertEquals(0, TestDatabase.rows(url), "a refused yarn must not be stored");
    }

    @Test
    public void emptyShopIsRefused() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        assertThrows(IllegalArgumentException.class, () -> dao.add("Linen", "", 1));
        assertThrows(IllegalArgumentException.class, () -> dao.add("Linen", " \t ", 1), "only spaces is empty too");
        assertEquals(0, TestDatabase.rows(url), "a refused yarn must not be stored");
    }

    @Test
    public void zeroOrFewerSkeinsIsRefused() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        assertThrows(IllegalArgumentException.class, () -> dao.add("Linen", "Knit Nook", 0));
        assertThrows(IllegalArgumentException.class, () -> dao.add("Linen", "Knit Nook", -3));
        assertEquals(0, TestDatabase.rows(url), "a refused yarn must not be stored");
    }

    @Test
    public void oneSkeinIsEnough() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        int id = dao.add("Cashmere", "Mill outlet", 1);
        assertEquals(1, dao.findById(id).getSkeins());
    }

    @Test
    public void textLongerThanAHundredCharactersIsRefused() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        String long101 = "b".repeat(101);
        assertThrows(IllegalArgumentException.class, () -> dao.add(long101, "Knit Nook", 1),
                "a name of 101 characters doesn't fit in VARCHAR(100): check it and throw IllegalArgumentException");
        assertThrows(IllegalArgumentException.class, () -> dao.add("Linen", long101, 1),
                "a shop of 101 characters doesn't fit in VARCHAR(100): check it and throw IllegalArgumentException");
        assertEquals(0, TestDatabase.rows(url), "a refused yarn must not be stored");
    }

    @Test
    public void aHundredCharactersIsEnough() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        String hundred = "c".repeat(100);
        int id = dao.add(hundred, "  " + hundred + " ", 1);
        assertEquals(new Yarn(id, hundred, hundred, 1), dao.findById(id),
                "100 characters fit, and the spaces around the text don't count: check the length after trim()");
    }

    @Test
    public void refusedYarnDoesNotUseUpAnId() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertThrows(IllegalArgumentException.class, () -> dao.add("Linen", "Knit Nook", 0));
        assertEquals(1, dao.add("Linen", "Knit Nook", 2),
                "check the values before the INSERT, so a refused yarn never reaches the database");
    }
}
