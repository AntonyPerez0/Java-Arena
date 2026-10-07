// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

/**
 * What an event acts on: #N (the node numbered N in the window JSON of the moment), #id (the node
 * with that id), Type "text" (the first node of that type whose text that is) or Type K (the K-th
 * node of that type), in outline order.
 */
final class Target {
    /** N of #N, or 0. */
    final int number;
    /** The id of #id, or null. */
    final String id;
    /** The JavaFX class name of Type targets, or null. */
    final String type;
    /** The text of Type "text", or null. */
    final String text;
    /** K of Type K, or 0. */
    final int index;

    private Target(int number, String id, String type, String text, int index) {
        this.number = number;
        this.id = id;
        this.type = type;
        this.text = text;
        this.index = index;
    }

    static Target number(int n) {
        return new Target(n, null, null, null, 0);
    }

    static Target id(String id) {
        return new Target(0, id, null, null, 0);
    }

    static Target withText(String type, String text) {
        return new Target(0, null, type, text, 0);
    }

    static Target index(String type, int k) {
        return new Target(0, null, type, null, k);
    }
}
