package yarnstash;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.Test;

// Step 4: update and remove.
public class UpdateAndRemoveTest {

    private static YarnDao stashWithThreeYarns() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Merino", "Knit Nook", 14);
        dao.add("Linen", "Market stall", 2);
        dao.add("Mohair", "Yarn swap", 3);
        return dao;
    }

    @Test
    public void updateChangesNameShopAndSkeins() {
        YarnDao dao = stashWithThreeYarns();
        assertTrue(dao.update(new Yarn(2, "Hemp", "Online shop", 1)), "yarn 2 exists, so update returns true");
        assertEquals(new Yarn(2, "Hemp", "Online shop", 1), dao.findById(2));
    }

    @Test
    public void updateLeavesTheOtherYarnsAsTheyWere() {
        YarnDao dao = stashWithThreeYarns();
        dao.update(new Yarn(2, "Linen", "Market stall", 5));
        assertEquals(List.of(
                new Yarn(1, "Merino", "Knit Nook", 14),
                new Yarn(2, "Linen", "Market stall", 5),
                new Yarn(3, "Mohair", "Yarn swap", 3)), dao.list(), "only the row with id 2 should change (WHERE id = ?)");
    }

    @Test
    public void updateIsKeptInTheDatabase() {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        int id = dao.add("Mohair", "Yarn swap", 3);
        dao.update(new Yarn(id, "Kid mohair", "Yarn swap", 4));
        assertEquals(new Yarn(id, "Kid mohair", "Yarn swap", 4), new JdbcYarnDao(url).findById(id),
                "another DAO on the same database should see the change");
    }

    @Test
    public void updateOfAMissingIdReturnsFalseAndAddsNothing() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        dao.add("Merino", "Knit Nook", 14);
        assertFalse(dao.update(new Yarn(9, "Cashmere", "Mill outlet", 40)), "there's no yarn 9");
        assertEquals(1, TestDatabase.rows(url), "update must not add a row");
        assertNull(dao.findById(9));
        assertEquals(new Yarn(1, "Merino", "Knit Nook", 14), dao.findById(1));
    }

    @Test
    public void updateInAnEmptyStashReturnsFalse() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertFalse(dao.update(new Yarn(1, "Cashmere", "Mill outlet", 40)));
        assertEquals(List.of(), dao.list());
    }

    @Test
    public void updateDropsSpacesAtTheStartAndEnd() {
        YarnDao dao = stashWithThreeYarns();
        dao.update(new Yarn(3, " Silk  ", "  Gift ", 2));
        assertEquals(new Yarn(3, "Silk", "Gift", 2), dao.findById(3));
    }

    @Test
    public void updateWithAQuoteWorks() {
        YarnDao dao = stashWithThreeYarns();
        dao.update(new Yarn(1, "Granny's merino", "O'Malley's shop", 1));
        assertEquals(new Yarn(1, "Granny's merino", "O'Malley's shop", 1), dao.findById(1));
    }

    @Test
    public void updateWithBadValuesIsRefusedAndChangesNothing() {
        YarnDao dao = stashWithThreeYarns();
        assertThrows(IllegalArgumentException.class, () -> dao.update(new Yarn(1, " ", "Knit Nook", 14)), "empty name");
        assertThrows(IllegalArgumentException.class, () -> dao.update(new Yarn(1, "Merino", "", 14)), "empty shop");
        assertThrows(IllegalArgumentException.class, () -> dao.update(new Yarn(1, "Merino", "Knit Nook", 0)), "0 skeins");
        assertEquals(new Yarn(1, "Merino", "Knit Nook", 14), dao.findById(1), "a refused update must change nothing");
    }

    @Test
    public void updateWithTextLongerThanAHundredCharactersIsRefused() {
        YarnDao dao = stashWithThreeYarns();
        String long101 = "d".repeat(101);
        assertThrows(IllegalArgumentException.class, () -> dao.update(new Yarn(1, long101, "Knit Nook", 14)),
                "a name of 101 characters doesn't fit in VARCHAR(100)");
        assertThrows(IllegalArgumentException.class, () -> dao.update(new Yarn(1, "Merino", long101, 14)),
                "a shop of 101 characters doesn't fit in VARCHAR(100)");
        assertEquals(new Yarn(1, "Merino", "Knit Nook", 14), dao.findById(1), "a refused update must change nothing");
        String hundred = "e".repeat(100);
        assertTrue(dao.update(new Yarn(1, " " + hundred + " ", hundred, 14)), "100 characters fit");
        assertEquals(new Yarn(1, hundred, hundred, 14), dao.findById(1));
    }

    @Test
    public void removeRemovesTheYarnAndReturnsTrue() {
        YarnDao dao = stashWithThreeYarns();
        assertTrue(dao.remove(2), "yarn 2 exists, so remove returns true");
        assertNull(dao.findById(2));
        assertEquals(List.of(
                new Yarn(1, "Merino", "Knit Nook", 14),
                new Yarn(3, "Mohair", "Yarn swap", 3)), dao.list(), "the other yarns stay");
    }

    @Test
    public void removeIsKeptInTheDatabase() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        int id = dao.add("Mohair", "Yarn swap", 3);
        dao.remove(id);
        assertEquals(0, TestDatabase.rows(url), "the row should be deleted from the table");
    }

    @Test
    public void removeOfAMissingIdReturnsFalse() {
        YarnDao dao = stashWithThreeYarns();
        assertFalse(dao.remove(4), "there's no yarn 4");
        assertFalse(dao.remove(0), "there's no yarn 0");
        assertEquals(3, dao.list().size(), "nothing should be removed");
    }

    @Test
    public void removingTwiceReturnsFalseTheSecondTime() {
        YarnDao dao = stashWithThreeYarns();
        assertTrue(dao.remove(1));
        assertFalse(dao.remove(1), "yarn 1 is already gone");
    }

    @Test
    public void removeInAnEmptyStashReturnsFalse() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertFalse(dao.remove(1));
    }

    @Test
    public void removedIdIsNotHandedOutAgain() {
        YarnDao dao = stashWithThreeYarns();
        dao.remove(3);
        assertEquals(4, dao.add("Chunky wool", "Yarn swap", 2),
                "the database doesn't hand out a removed row's id again, so an old yarn 3 never means a new one");
    }

    @Test
    public void removeAllThenTheStashIsEmpty() {
        YarnDao dao = stashWithThreeYarns();
        dao.remove(1);
        dao.remove(2);
        dao.remove(3);
        assertEquals(List.of(), dao.list());
    }
}
