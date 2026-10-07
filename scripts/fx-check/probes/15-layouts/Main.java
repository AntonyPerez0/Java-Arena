// Probe: every pane's constructors and settings, regions' sizes and padding, ids, styles that
// don't change what the outline shows, and disabled or hidden panes, as the window outline shows them.
import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
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
    private int step;

    @Override
    public void start(Stage stage) {
        HBox h1 = new HBox();
        HBox h2 = new HBox(8);
        HBox h3 = new HBox(new Label("h3 a"), new Label("h3 b"));
        HBox h4 = new HBox(4.5, new Button("h4"));
        h4.setAlignment(Pos.BASELINE_RIGHT);
        h2.setSpacing(12);
        VBox v1 = new VBox();
        VBox v2 = new VBox(3);
        VBox v3 = new VBox(new Label("v3"));
        VBox v4 = new VBox(-2, new Label("v4"));
        v3.setAlignment(Pos.CENTER);
        v1.setAlignment(Pos.TOP_LEFT);
        FlowPane f1 = new FlowPane();
        FlowPane f2 = new FlowPane(new Label("f2"));
        FlowPane f3 = new FlowPane(5, 6);
        f3.setHgap(7);
        f3.setVgap(0);
        f1.setAlignment(Pos.BOTTOM_CENTER);
        StackPane s1 = new StackPane();
        StackPane s2 = new StackPane(new Label("s2"));
        s2.setAlignment(Pos.TOP_LEFT);
        s1.setAlignment(Pos.CENTER);
        GridPane g = new GridPane();
        g.setHgap(2.5);
        g.setVgap(1);
        g.setAlignment(Pos.CENTER_RIGHT);
        g.add(new Label("g"), 0, 0);
        BorderPane b = new BorderPane();
        b.setCenter(new Label("b"));
        Pane p = new Pane();

        h1.setPadding(new Insets(4));
        h2.setPadding(new Insets(1, 2, 3, 4));
        h3.setPadding(Insets.EMPTY);
        v2.setPrefSize(100, 50);
        v3.setPrefWidth(80);
        v4.setPrefHeight(30);
        f2.setMinSize(10, 10);
        f2.setMaxSize(500, 500);
        p.setPrefSize(-1, 25);
        s1.setId("stack-1");
        s1.setStyle("-fx-background-color: lightblue;");
        g.setStyle("-fx-border-color: gray");
        Label colored = new Label("colored");
        colored.setStyle("-fx-text-fill: red; -fx-background-color: yellow");
        Button styled = new Button("styled");
        styled.setStyle("-fx-base: #ffcccc");

        VBox off = new VBox(new Button("in off"), new Label("label in off"));
        off.setDisable(true);
        HBox hidden = new HBox(new Label("in hidden"));
        hidden.setVisible(false);
        TextField wide = new TextField("wide");
        wide.setPrefWidth(250);
        wide.setPrefSize(250, 30);
        Label wrapped = new Label("wrapped");
        wrapped.setWrapText(true);
        wrapped.setPrefWidth(60);

        Button inOff = (Button) off.getChildren().get(0);
        inOff.setOnAction(e -> System.out.println("the button in the disabled box ran its handler"));
        System.out.println("in off: disable " + inOff.isDisable() + ", disabled " + inOff.isDisabled() + "; off disabled " + off.isDisabled());
        inOff.fire();
        System.out.println("fire() on it did nothing");
        Button next = new Button("Next");
        next.setOnAction(e -> {
            step++;
            System.out.println("step " + step);
            if (step == 1) {
                h1.setSpacing(3);
                v1.setAlignment(Pos.BOTTOM_LEFT);
                off.setDisable(false);
                hidden.setVisible(true);
                s1.setStyle("");
                g.setHgap(0);
            } else if (step == 2) {
                h2.setPadding(new Insets(0));
                v2.setPrefSize(-1, -1);
                wide.setPrefWidth(-1);
                colored.setId("");
                f1.setAlignment(Pos.TOP_LEFT);
                s2.setAlignment(Pos.CENTER);
            }
            if (step == 1) {
                inOff.fire();
                System.out.println("in off after enabling the box: disabled " + inOff.isDisabled());
            }
            System.out.println("h1 spacing " + h1.getSpacing() + ", v1 " + v1.getAlignment() + ", off " + off.isDisable() + ", hidden visible " + hidden.isVisible() + ", g hgap " + g.getHgap() + ", h2 padding " + h2.getPadding() + ", v2 pref " + v2.getPrefWidth() + " x " + v2.getPrefHeight());
        });
        System.out.println("v2 pref " + v2.getPrefWidth() + " x " + v2.getPrefHeight() + ", p pref " + p.getPrefWidth() + " x " + p.getPrefHeight() + ", s1 id " + s1.getId() + ", style " + s1.getStyle());

        VBox root = new VBox(2, next, h1, h2, h3, h4, v1, v2, v3, v4, f1, f2, f3, s1, s2, g, b, p, colored, styled, off, hidden, wide, wrapped);
        root.setPadding(new Insets(8, 0, 8, 0));
        stage.setScene(new Scene(root, 600, 800));
        stage.setTitle("Layouts");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
