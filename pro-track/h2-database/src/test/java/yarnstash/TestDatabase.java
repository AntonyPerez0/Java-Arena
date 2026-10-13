package yarnstash;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Helpers for the tests: a new, empty database in memory for each test, and plain JDBC to look
 * into it past the DAO. These aren't tests themselves.
 */
public class TestDatabase {
    private static int created = 0;

    /**
     * The URL of a database in memory that no other test uses. DB_CLOSE_DELAY=-1 keeps it alive
     * while the tests run, even when no connection to it is open.
     */
    public static String freshUrl() {
        created++;
        return "jdbc:h2:mem:yarnstash-test-" + created + ";DB_CLOSE_DELAY=-1";
    }

    /** Runs one SQL statement that isn't a SELECT, such as an INSERT. */
    public static void execute(String url, String sql) throws SQLException {
        try (Connection connection = DriverManager.getConnection(url, "sa", "");
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.executeUpdate();
        }
    }

    /** Runs a SELECT whose answer is one number, such as SELECT COUNT(*) FROM Yarn. */
    public static int number(String url, String sql) throws SQLException {
        try (Connection connection = DriverManager.getConnection(url, "sa", "");
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet rows = statement.executeQuery()) {
            rows.next();
            return rows.getInt(1);
        }
    }

    /** Runs a SELECT whose answer is one piece of text. */
    public static String text(String url, String sql) throws SQLException {
        try (Connection connection = DriverManager.getConnection(url, "sa", "");
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet rows = statement.executeQuery()) {
            rows.next();
            return rows.getString(1);
        }
    }

    /** How many rows the table Yarn has. */
    public static int rows(String url) throws SQLException {
        return number(url, "SELECT COUNT(*) FROM Yarn");
    }
}
