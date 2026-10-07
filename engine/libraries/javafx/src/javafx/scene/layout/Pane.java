// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.layout;

import javafx.collections.ObservableList;
import javafx.scene.Node;

/** A region whose children list is public: add nodes to getChildren() to put them in the pane. */
public class Pane extends Region {
    public Pane() {
    }

    public Pane(Node... children) {
        getChildren().addAll(children);
    }

    @Override
    public ObservableList<Node> getChildren() {
        return super.getChildren();
    }
}
