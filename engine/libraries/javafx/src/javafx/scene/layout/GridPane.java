// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.layout;

import arena.fx.GridCells;
import javafx.geometry.Pos;
import javafx.scene.Node;

/** A pane that places its children in the cells of a grid, by column and row (both counted from 0). */
public class GridPane extends Pane {
    private double hgap;
    private double vgap;
    private Pos alignment = Pos.TOP_LEFT;

    public GridPane() {
    }

    /** Adds the node in the cell at this column and row. */
    public void add(Node child, int columnIndex, int rowIndex) {
        check("rowIndex", rowIndex, 0);
        check("columnIndex", columnIndex, 0);
        Integer[] cell = GridCells.get(child);
        GridCells.set(child, columnIndex, rowIndex, cell[2], cell[3]);
        getChildren().add(child);
    }

    /** Adds the node at this column and row, spanning colspan columns and rowspan rows. */
    public void add(Node child, int columnIndex, int rowIndex, int colspan, int rowspan) {
        check("rowIndex", rowIndex, 0);
        check("columnIndex", columnIndex, 0);
        check("columnSpan", colspan, 1);
        check("rowSpan", rowspan, 1);
        GridCells.set(child, columnIndex, rowIndex, colspan, rowspan);
        getChildren().add(child);
    }

    private static void check(String what, int value, int least) {
        if (value < least) {
            throw new IllegalArgumentException(what + " must be greater or equal to " + least + ", but was " + value);
        }
    }

    /** The column the node was added in, or null. */
    public static Integer getColumnIndex(Node child) {
        return GridCells.get(child)[0];
    }

    /** The row the node was added in, or null. */
    public static Integer getRowIndex(Node child) {
        return GridCells.get(child)[1];
    }

    public final void setHgap(double value) {
        hgap = value;
    }

    public final double getHgap() {
        return hgap;
    }

    public final void setVgap(double value) {
        vgap = value;
    }

    public final double getVgap() {
        return vgap;
    }

    public final void setAlignment(Pos value) {
        alignment = value;
    }

    public final Pos getAlignment() {
        return alignment;
    }

    /** As JavaFX writes a grid pane. */
    @Override
    public String toString() {
        return "Grid hgap=" + hgap + ", vgap=" + vgap + ", alignment=" + alignment;
    }
}
