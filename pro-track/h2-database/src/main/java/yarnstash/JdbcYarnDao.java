package yarnstash;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * A YarnDao that keeps the yarn in an H2 database, in the table Yarn. README.md, "Steps", says
 * what each method does and which tests check it.
 */
public class JdbcYarnDao implements YarnDao {
    private final String url;

    /**
     * A DAO for the database at this JDBC URL, such as jdbc:h2:./yarnstash (a file) or
     * jdbc:h2:mem:test;DB_CLOSE_DELAY=-1 (in memory, as in the tests).
     */
    public JdbcYarnDao(String url) {
        this.url = url;
        // TODO: Step 1. Create the table Yarn if it doesn't exist yet (README.md has its
        //  columns). Use try-with-resources for the connection and the statement, and turn an
        //  SQLException into an IllegalStateException with the SQLException as its cause.
    }

    /** A new connection to the database. Close it when you're done (try-with-resources). */
    private Connection connect() throws SQLException {
        return DriverManager.getConnection(this.url, "sa", "");
    }

    @Override
    public int add(String name, String shop, int skeins) {
        // TODO: Step 2. Check the values, then INSERT a row and return the id the database
        //  gave it (Statement.RETURN_GENERATED_KEYS and getGeneratedKeys()).
        throw new UnsupportedOperationException("add isn't written yet (step 2)");
    }

    @Override
    public Yarn findById(int id) {
        // TODO: Step 2. SELECT the row with this id. Return null when there's no such row.
        throw new UnsupportedOperationException("findById isn't written yet (step 2)");
    }

    @Override
    public List<Yarn> list() {
        // TODO: Step 3. SELECT every row, ORDER BY id, and make a Yarn of each.
        throw new UnsupportedOperationException("list isn't written yet (step 3)");
    }

    @Override
    public List<Yarn> search(String text) {
        // TODO: Step 3. The yarns whose name contains the text, ignoring case.
        throw new UnsupportedOperationException("search isn't written yet (step 3)");
    }

    @Override
    public boolean update(Yarn yarn) {
        // TODO: Step 4. Check the values, then UPDATE the row with the yarn's id.
        throw new UnsupportedOperationException("update isn't written yet (step 4)");
    }

    @Override
    public boolean remove(int id) {
        // TODO: Step 4. DELETE the row with this id.
        throw new UnsupportedOperationException("remove isn't written yet (step 4)");
    }

    @Override
    public Map<String, Integer> totalsByName() {
        // TODO: Step 5. The sum of the skeins of each yarn name.
        return new HashMap<>();
    }
}
