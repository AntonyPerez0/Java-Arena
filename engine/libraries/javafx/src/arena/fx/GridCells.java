// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.IdentityHashMap;
import javafx.scene.Node;

/**
 * Where a node sits in a GridPane: its column, row and spans, each null when not set. As in
 * JavaFX, a node keeps them when it moves to another pane.
 */
public final class GridCells {
    private static final IdentityHashMap<Node, Integer[]> CELLS = new IdentityHashMap<Node, Integer[]>();

    private GridCells() {
    }

    public static synchronized void set(Node node, Integer column, Integer row, Integer columnSpan, Integer rowSpan) {
        CELLS.put(node, new Integer[] { column, row, columnSpan, rowSpan });
    }

    /** { column, row, columnSpan, rowSpan }, each null when not set. */
    public static synchronized Integer[] get(Node node) {
        Integer[] cell = CELLS.get(node);
        return cell == null ? new Integer[4] : cell.clone();
    }
}
