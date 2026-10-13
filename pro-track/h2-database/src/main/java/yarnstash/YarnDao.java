package yarnstash;

import java.util.List;
import java.util.Map;

/**
 * Everything the yarn stash can do with its yarn, with no word about where it is kept.
 * JdbcYarnDao keeps it in an H2 database.
 *
 * <p>This interface is ready: you don't need to change it.
 */
public interface YarnDao {

    /**
     * Adds a yarn and returns the id the database gave it. The name and the shop are stored
     * without spaces at their start and end.
     *
     * @throws IllegalArgumentException if the name or the shop is empty or only spaces, or longer
     *     than 100 characters without the spaces at its start and end, or skeins is less than 1.
     *     Nothing is stored then.
     */
    int add(String name, String shop, int skeins);

    /** The yarn with this id, or null if there's none. */
    Yarn findById(int id);

    /** Every yarn, in the order of their ids (smallest first). */
    List<Yarn> list();

    /**
     * The yarns whose name contains the text, ignoring upper and lower case, in the order of
     * their ids. Every character of the text is plain text, % and _ too. An empty text is in
     * every name, so it finds every yarn.
     */
    List<Yarn> search(String text);

    /**
     * Changes the name, the shop and the number of skeins of the yarn with the same id as the
     * given one. The same rules as in add: spaces at the start and end are dropped.
     *
     * @return true if there was a yarn with that id, false if not (then nothing changes)
     * @throws IllegalArgumentException for the same reasons as add. Nothing changes then.
     */
    boolean update(Yarn yarn);

    /** Removes the yarn with this id. Returns true if there was one, false if not. */
    boolean remove(int id);

    /**
     * How many skeins of each yarn there are in all: each name, as it is written, maps to the
     * sum of its lines' skeins. A name with no lines isn't in the map.
     */
    Map<String, Integer> totalsByName();
}
