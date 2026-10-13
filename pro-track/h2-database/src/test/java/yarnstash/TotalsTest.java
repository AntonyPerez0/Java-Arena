package yarnstash;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.sql.SQLException;
import java.util.Map;
import org.junit.jupiter.api.Test;

// Step 5: totalsByName.
public class TotalsTest {

    @Test
    public void emptyStashHasNoTotals() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        assertEquals(Map.of(), dao.totalsByName());
    }

    @Test
    public void oneYarn() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Mohair", "Gift", 1);
        assertEquals(Map.of("Mohair", 1), dao.totalsByName());
    }

    @Test
    public void addsUpTheSkeinsOfEachName() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Sock yarn", "Knit Nook", 3);
        dao.add("Linen", "Market stall", 4);
        dao.add("Sock yarn", "Yarn swap", 12);
        dao.add("Linen", "Online shop", 2);
        dao.add("Sock yarn", "Knit Nook", 5);
        dao.add("Mohair", "Gift", 1);
        assertEquals(Map.of("Sock yarn", 20, "Linen", 6, "Mohair", 1), dao.totalsByName());
    }

    @Test
    public void nameWrittenInAnotherCaseIsAnotherKey() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Merino", "Knit Nook", 1);
        dao.add("merino", "Yarn swap", 2);
        dao.add("Merino", "Yarn swap", 3);
        assertEquals(Map.of("Merino", 4, "merino", 2), dao.totalsByName(),
                "each name as it is written is a key of its own");
    }

    @Test
    public void totalsFollowUpdatesAndRemovals() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        int first = dao.add("Cashmere", "Knit Nook", 1);
        int second = dao.add("Gray tweed", "Market stall", 2);
        dao.add("Cashmere", "Online shop", 2);
        dao.update(new Yarn(first, "Cashmere", "Knit Nook", 4));
        dao.remove(second);
        assertEquals(Map.of("Cashmere", 6), dao.totalsByName(),
                "Gray tweed had only one line, removed, so it isn't in the map");
    }

    @Test
    public void totalsReadTheDatabase() throws SQLException {
        String url = TestDatabase.freshUrl();
        YarnDao dao = new JdbcYarnDao(url);
        TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Cotton bloom', 'Knit Nook', 30)");
        TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Cotton bloom', 'Knit Nook', 12)");
        assertEquals(Map.of("Cotton bloom", 42), dao.totalsByName());
    }

    @Test
    public void bigTotalsAreAddedRight() {
        YarnDao dao = new JdbcYarnDao(TestDatabase.freshUrl());
        dao.add("Cotton cones", "Mill outlet", 40000);
        dao.add("Cotton cones", "Online shop", 60000);
        assertEquals(Map.of("Cotton cones", 100000), dao.totalsByName());
    }
}
