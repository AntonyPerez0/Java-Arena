package yarnstash;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;

// Step 1: the constructor creates the table Yarn.
public class SchemaTest {

    @Test
    public void constructorCreatesAnEmptyTable() throws SQLException {
        String url = TestDatabase.freshUrl();
        new JdbcYarnDao(url);
        assertEquals(0, TestDatabase.rows(url), "a new table has no rows");
    }

    @Test
    public void tableHasTheFourColumns() throws SQLException {
        String url = TestDatabase.freshUrl();
        new JdbcYarnDao(url);
        TestDatabase.execute(url, "INSERT INTO Yarn (id, name, shop, skeins) VALUES (7, 'Gray alpaca', 'Knit Nook', 2)");
        assertEquals("Gray alpaca", TestDatabase.text(url, "SELECT name FROM Yarn WHERE id = 7"));
        assertEquals("Knit Nook", TestDatabase.text(url, "SELECT shop FROM Yarn WHERE id = 7"));
        assertEquals(2, TestDatabase.number(url, "SELECT skeins FROM Yarn WHERE id = 7"));
    }

    @Test
    public void databaseHandsOutTheIds() throws SQLException {
        String url = TestDatabase.freshUrl();
        new JdbcYarnDao(url);
        TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Silk blend', 'Online shop', 1)");
        TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Cotton bloom', 'Online shop', 5)");
        assertEquals(1, TestDatabase.number(url, "SELECT id FROM Yarn WHERE name = 'Silk blend'"),
                "the id column should be an identity column, so the first row gets id 1");
        assertEquals(2, TestDatabase.number(url, "SELECT id FROM Yarn WHERE name = 'Cotton bloom'"),
                "the second row should get id 2");
    }

    @Test
    public void idIsThePrimaryKey() throws SQLException {
        String url = TestDatabase.freshUrl();
        new JdbcYarnDao(url);
        TestDatabase.execute(url, "INSERT INTO Yarn (id, name, shop, skeins) VALUES (3, 'Linen', 'Market stall', 1)");
        assertThrows(SQLException.class,
                () -> TestDatabase.execute(url, "INSERT INTO Yarn (id, name, shop, skeins) VALUES (3, 'Mohair', 'Market stall', 9)"),
                "two rows must not have the same id (PRIMARY KEY)");
    }

    @Test
    public void nameShopAndSkeinsAreNotNull() throws SQLException {
        String url = TestDatabase.freshUrl();
        new JdbcYarnDao(url);
        assertThrows(SQLException.class,
                () -> TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES (NULL, 'Knit Nook', 1)"),
                "name should be NOT NULL");
        assertThrows(SQLException.class,
                () -> TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Linen', NULL, 1)"),
                "shop should be NOT NULL");
        assertThrows(SQLException.class,
                () -> TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Linen', 'Knit Nook', NULL)"),
                "skeins should be NOT NULL");
    }

    @Test
    public void nameAndShopHoldAHundredCharacters() throws SQLException {
        String url = TestDatabase.freshUrl();
        new JdbcYarnDao(url);
        String hundred = "a".repeat(100);
        TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('" + hundred + "', '" + hundred + "', 1)");
        assertEquals(hundred, TestDatabase.text(url, "SELECT name FROM Yarn"));
    }

    @Test
    public void secondDaoOnTheSameDatabaseKeepsTheRows() throws SQLException {
        String url = TestDatabase.freshUrl();
        new JdbcYarnDao(url);
        TestDatabase.execute(url, "INSERT INTO Yarn (name, shop, skeins) VALUES ('Mohair', 'Gift', 1)");
        new JdbcYarnDao(url);
        assertEquals(1, TestDatabase.rows(url),
                "making a second DAO must not fail or empty the table: use CREATE TABLE IF NOT EXISTS");
    }

    @Test
    public void constructorWithABadUrlThrowsIllegalStateException() {
        assertThrows(IllegalStateException.class, () -> new JdbcYarnDao("jdbc:nosuchdatabase:x"),
                "an SQLException should come out as an IllegalStateException");
    }
}
