// Probe: children lists (ObservableList) with JavaFX's rules: no null, no node twice, no cycles,
// a node added elsewhere leaves its old parent; every list method; getChildrenUnmodifiable,
// getParent, getScene, lookup; BorderPane regions replaced; GridPane cells, order and spans.
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import javafx.application.Application;
import javafx.collections.ObservableList;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    private final VBox list = new VBox(2);
    private final BorderPane border = new BorderPane();
    private final GridPane grid = new GridPane();
    private int added;

    static String names(List<? extends Node> nodes) {
        List<String> out = new ArrayList<String>();
        for (Node n : nodes) {
            out.add(n instanceof Label ? ((Label) n).getText() : n instanceof Button ? "[" + ((Button) n).getText() + "]" : n.getClass().getSimpleName());
        }
        return out.toString();
    }

    static void attempt(String what, Runnable change) {
        try {
            change.run();
            System.out.println(what + ": fine");
        } catch (RuntimeException e) {
            String m = String.valueOf(e.getMessage());
            int cut = m.indexOf(": parent = ");
            System.out.println(what + ": " + e.getClass().getSimpleName() + " " + (cut >= 0 ? m.substring(0, cut) : m));
        }
    }

    @Override
    public void start(Stage stage) {
        Label a = new Label("a");
        Label b = new Label("b");
        Label c = new Label("c");
        Label d = new Label("d");
        ObservableList<Node> kids = list.getChildren();
        System.out.println("addAll " + kids.addAll(a, b) + " " + names(kids) + ", a's parent is the list " + (a.getParent() == list));
        kids.add(0, c);
        kids.add(d);
        System.out.println("after add(0, c) and add(d) " + names(kids) + ", size " + kids.size() + ", indexOf(b) " + kids.indexOf(b) + ", contains(d) " + kids.contains(d));
        attempt("add(a) again", () -> kids.add(a));
        attempt("add(0, a) again", () -> kids.add(0, a));
        attempt("addAll(x, x)", () -> kids.addAll(new Label("x"), a));
        attempt("add(null)", () -> kids.add(null));
        attempt("add(list) to itself", () -> kids.add(list));
        attempt("set(1, d) (d is already in)", () -> kids.set(1, d));
        attempt("set(1, a) (a is there)", () -> kids.set(1, a));
        System.out.println("after the failures " + names(kids));
        Node old = kids.set(0, new Label("c2"));
        System.out.println("set(0, c2) returned " + ((Label) old).getText() + ", c's parent " + c.getParent() + ", now " + names(kids));
        kids.remove(1, 2);
        System.out.println("remove(1, 2) " + names(kids) + ", b's parent " + b.getParent());
        System.out.println("removeAll(d) " + kids.removeAll(d) + " " + names(kids));
        System.out.println("remove(c) (not in it) " + kids.remove(c));
        kids.setAll(a, b, c);
        System.out.println("setAll(a, b, c) " + names(kids));
        kids.setAll(Arrays.asList(c, b));
        System.out.println("setAll(list of c, b) " + names(kids) + ", a's parent " + a.getParent());
        Iterator<Node> it = kids.iterator();
        it.next();
        it.remove();
        System.out.println("iterator remove " + names(kids) + ", c's parent " + c.getParent());
        kids.clear();
        System.out.println("clear " + names(kids) + ", b's parent " + b.getParent());
        attempt("remove(0, 1) on an empty list", () -> kids.remove(0, 1));
        attempt("add(5, x)", () -> kids.add(5, new Label("x")));
        attempt("add(-1, x)", () -> kids.add(-1, new Label("x")));
        attempt("add(5, null)", () -> kids.add(5, null));
        attempt("get(0)", () -> kids.get(0));
        attempt("remove(0)", () -> kids.remove(0));
        attempt("set(0, x)", () -> kids.set(0, new Label("x")));
        attempt("addAll(3, list)", () -> kids.addAll(3, Arrays.asList(new Label("x"))));
        attempt("addAll(-1, empty list)", () -> kids.addAll(-1, new ArrayList<Node>()));
        kids.addAll(new Label("p"), new Label("q"));
        attempt("remove(1, 0)", () -> kids.remove(1, 0));
        attempt("remove(-1, 1)", () -> kids.remove(-1, 1));
        attempt("remove(0, 3)", () -> kids.remove(0, 3));
        attempt("remove(1, 1)", () -> kids.remove(1, 1));
        attempt("get(2)", () -> kids.get(2));
        attempt("set(2, x)", () -> kids.set(2, new Label("x")));
        attempt("set(-1, x)", () -> kids.set(-1, new Label("x")));
        attempt("set(0, null)", () -> kids.set(0, null));
        attempt("remove(2)", () -> kids.remove(2));
        attempt("subList(0, 1).clear()", () -> kids.subList(0, 1).clear());
        System.out.println("after the index checks " + names(kids));
        attempt("removeAll(nothing)", () -> System.out.print("removeAll() " + kids.removeAll() + ": "));
        attempt("retainAll(empty)", () -> System.out.print("retainAll " + kids.retainAll(new ArrayList<Node>()) + ": "));
        attempt("setAll(x, null)", () -> kids.setAll(new Label("x"), null));
        attempt("setAll(x, x)", () -> {
            Label x = new Label("x");
            kids.setAll(x, x);
        });
        System.out.println("after the setAll checks " + names(kids));
        kids.clear();
        kids.addAll(Arrays.asList(a, b));

        // Moving a node: it leaves its old parent.
        HBox other = new HBox();
        other.getChildren().add(a);
        System.out.println("moved a: list " + names(kids) + ", other " + names(other.getChildren()) + ", a's parent is other " + (a.getParent() == other));
        list.getChildren().add(other);
        Parent p = other;
        System.out.println("unmodifiable " + names(p.getChildrenUnmodifiable()) + ", same size " + (p.getChildrenUnmodifiable().size() == other.getChildren().size()));
        attempt("unmodifiable add", () -> list.getChildrenUnmodifiable().add(new Label("x")));
        attempt("unmodifiable clear (empty)", () -> new VBox().getChildrenUnmodifiable().clear());
        attempt("cycle: other into a child of itself", () -> {
            VBox inner = new VBox();
            other.getChildren().add(inner);
            inner.getChildren().add(other);
        });

        // BorderPane: regions replaced, the children list follows.
        border.setTop(new Label("top 1"));
        border.setTop(new Label("top 2"));
        Label center = new Label("center");
        border.setCenter(center);
        border.setLeft(new Button("left"));
        border.setRight(new Label("right"));
        border.setBottom(new Label("bottom"));
        System.out.println("border children " + names(border.getChildren()) + ", center's parent is border " + (center.getParent() == border));
        border.setRight(null);
        System.out.println("right removed: " + names(border.getChildren()) + ", getRight " + border.getRight());
        border.getChildren().remove(center);
        System.out.println("center taken out of the children: getCenter " + border.getCenter());
        border.setCenter(center);
        VBox elsewhere = new VBox();
        elsewhere.getChildren().add(border.getLeft());
        System.out.println("left moved elsewhere: getLeft " + border.getLeft() + ", children " + names(border.getChildren()));
        BorderPane five = new BorderPane(new Label("C"), new Label("T"), new Label("R"), new Label("B"), new Label("L"));
        System.out.println("five regions " + names(five.getChildren()) + ", center " + ((Label) five.getCenter()).getText());
        BorderPane one = new BorderPane(new Label("only center"));

        // GridPane: cells, order by row then column, spans.
        Label late = new Label("added first, row 2");
        System.out.println("before add: column " + GridPane.getColumnIndex(late) + ", row " + GridPane.getRowIndex(late));
        grid.add(late, 0, 2);
        grid.add(new Label("(1, 0)"), 1, 0);
        grid.add(new Label("(0, 0)"), 0, 0);
        grid.add(new TextArea("wide"), 0, 1, 2, 1);
        grid.add(new Label("tall"), 2, 0, 1, 3);
        grid.add(new Label("(1, 0) again"), 1, 0);
        grid.getChildren().add(new Label("no cell"));
        System.out.println("grid children (insertion order) " + names(grid.getChildren()) + ", late at " + GridPane.getColumnIndex(late) + "," + GridPane.getRowIndex(late));
        attempt("grid.add(x, -1, 0)", () -> grid.add(new Label("x"), -1, 0));
        attempt("grid.add(x, 0, -2)", () -> grid.add(new Label("x"), 0, -2));
        attempt("grid.add(x, 0, 0, 0, 1)", () -> grid.add(new Label("x"), 0, 0, 0, 1));
        attempt("grid.add(late) again", () -> grid.add(late, 3, 3));
        StackPane stack = new StackPane(new Label("under"), new Button("over"));
        FlowPane flow = new FlowPane(new Label("f1"), new Label("f2"));
        Pane plain = new Pane(new Label("in a plain Pane"));

        Button add = new Button("Add");
        add.setOnAction(e -> list.getChildren().add(0, new Label("added " + ++added)));
        Button move = new Button("Move");
        move.setOnAction(e -> other.getChildren().add(list.getChildren().get(0)));
        Button swap = new Button("Swap");
        swap.setOnAction(e -> {
            Node top = border.getTop();
            border.setTop(border.getBottom());
            border.setBottom(top);
            System.out.println("swapped: top " + ((Label) border.getTop()).getText() + ", bottom " + border.getBottom() + ", children " + names(border.getChildren()));
        });

        VBox root = new VBox(4, new HBox(4, add, move, swap), list, border, grid, stack, flow, plain, five, one, elsewhere);
        Scene scene = new Scene(root);
        System.out.println("scene of a: " + (a.getScene() == scene) + ", of a node outside: " + new Label().getScene() + ", root's parent " + root.getParent());
        System.out.println("lookup #nobody " + root.lookup("#nobody"));
        center.setId("middle");
        System.out.println("lookup #middle is center " + (root.lookup("#middle") == center) + ", center.lookup(#middle) " + (center.lookup("#middle") == center) + ", lookup middle " + root.lookup("middle"));
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
