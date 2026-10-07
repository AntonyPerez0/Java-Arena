// Probe: what things are before anyone sets them, and how they print (toString), plus Insets and Pos.
import java.util.Arrays;
import javafx.application.Application;
import javafx.event.ActionEvent;
import javafx.event.Event;
import javafx.event.EventHandler;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        System.out.println("stage: title " + stage.getTitle() + ", scene " + stage.getScene() + ", showing " + stage.isShowing() + ", resizable " + stage.isResizable() + ", width " + stage.getWidth() + ", height " + stage.getHeight());
        TextField field = new TextField();
        System.out.println("TextField: text \"" + field.getText() + "\", length " + field.getLength() + ", prompt \"" + field.getPromptText() + "\", editable " + field.isEditable() + ", onAction " + field.getOnAction() + ", font " + field.getFont());
        TextField given = new TextField("given");
        System.out.println("TextField(given): " + given.getText() + ", length " + given.getLength());
        PasswordField password = new PasswordField();
        System.out.println("PasswordField: \"" + password.getText() + "\", is a TextField " + (password instanceof TextField));
        TextArea area = new TextArea();
        System.out.println("TextArea: \"" + area.getText() + "\", wrap " + area.isWrapText() + ", prompt \"" + area.getPromptText() + "\"; TextArea(x) " + new TextArea("x").getText());
        Label label = new Label();
        System.out.println("Label: \"" + label.getText() + "\", wrap " + label.isWrapText() + ", font " + label.getFont() + "; Label(x) " + new Label("x").getText());
        Button button = new Button();
        System.out.println("Button: \"" + button.getText() + "\", onAction " + button.getOnAction() + ", Button(x) " + new Button("x").getText());
        System.out.println("Node: id " + label.getId() + ", style \"" + label.getStyle() + "\", visible " + label.isVisible() + ", disable " + label.isDisable() + ", disabled " + label.isDisabled() + ", parent " + label.getParent() + ", scene " + label.getScene());
        VBox v = new VBox();
        HBox h = new HBox();
        System.out.println("VBox: spacing " + v.getSpacing() + ", alignment " + v.getAlignment() + ", padding " + v.getPadding() + ", pref " + v.getPrefWidth() + " x " + v.getPrefHeight() + ", children " + v.getChildren().size());
        System.out.println("HBox: spacing " + h.getSpacing() + ", alignment " + h.getAlignment() + "; VBox(5) " + new VBox(5).getSpacing() + ", HBox(7) " + new HBox(7).getSpacing());
        FlowPane flow = new FlowPane();
        System.out.println("FlowPane: hgap " + flow.getHgap() + ", vgap " + flow.getVgap() + ", alignment " + flow.getAlignment() + "; FlowPane(3, 4) " + new FlowPane(3, 4).getHgap() + " " + new FlowPane(3, 4).getVgap());
        GridPane grid = new GridPane();
        System.out.println("GridPane: hgap " + grid.getHgap() + ", vgap " + grid.getVgap() + ", alignment " + grid.getAlignment());
        StackPane stack = new StackPane();
        System.out.println("StackPane: alignment " + stack.getAlignment());
        BorderPane border = new BorderPane();
        System.out.println("BorderPane: top " + border.getTop() + ", left " + border.getLeft() + ", center " + border.getCenter() + ", right " + border.getRight() + ", bottom " + border.getBottom());
        System.out.println("Region.USE_COMPUTED_SIZE " + Region.USE_COMPUTED_SIZE + ", Pane " + new Pane().getChildren().size());
        System.out.println("Font.getDefault() " + Font.getDefault() + ", name " + Font.getDefault().getName() + ", family " + Font.getDefault().getFamily() + ", size " + Font.getDefault().getSize());

        System.out.println("Insets.EMPTY " + Insets.EMPTY + ", Insets(5) " + new Insets(5) + ", Insets(1, 2, 3, 4) " + new Insets(1, 2, 3, 4));
        Insets in = new Insets(1.5, 2, 3, 4);
        System.out.println("getters " + in.getTop() + " " + in.getRight() + " " + in.getBottom() + " " + in.getLeft() + ", equals " + in.equals(new Insets(1.5, 2, 3, 4)) + " " + in.equals(new Insets(1.5)) + " " + new Insets(0).equals(Insets.EMPTY) + " " + in.equals("x") + " " + new Insets(-0.0).equals(Insets.EMPTY));
        System.out.println("hashCodes " + Insets.EMPTY.hashCode() + " " + new Insets(10).hashCode() + " " + in.hashCode() + " " + new Insets(-0.0).hashCode() + " " + new Insets(Double.NaN).equals(new Insets(Double.NaN)));
        System.out.println("Pos " + Arrays.toString(Pos.values()) + ", valueOf CENTER " + Pos.valueOf("CENTER").ordinal() + ", BASELINE_RIGHT " + Pos.BASELINE_RIGHT.ordinal());

        System.out.println("toString: " + label + " | " + new Label("hi") + " | " + new Button("ok") + " | " + field + " | " + password + " | " + area + " | " + v + " | " + h + " | " + flow + " | " + grid + " | " + stack + " | " + border);
        Label withId = new Label("named");
        withId.setId("title");
        Button idButton = new Button("b");
        idButton.setId("go");
        VBox idBox = new VBox();
        idBox.setId("box");
        System.out.println("with ids: " + withId + " | " + idButton + " | " + idBox);
        System.out.println("text properties: " + new Label("p").textProperty() + " | " + new TextField("q").textProperty());
        ActionEvent action = new ActionEvent();
        Event event = action;
        EventHandler<ActionEvent> handler = e -> System.out.println("handled");
        System.out.println("ActionEvent is an EventObject " + (event instanceof java.util.EventObject) + ", a handler is an EventListener " + (handler instanceof java.util.EventListener));
        try {
            v.setPadding(null);
            System.out.println("setPadding(null) is fine: " + v.getPadding());
        } catch (NullPointerException e) {
            System.out.println("setPadding(null): " + e.getMessage());
        }
        try {
            new Scene(null);
        } catch (NullPointerException e) {
            System.out.println("new Scene(null): " + e.getMessage());
        }
        VBox taken = new VBox();
        Scene first = new Scene(taken);
        try {
            new Scene(taken);
        } catch (IllegalArgumentException e) {
            System.out.println("a root of another scene: " + e.getMessage().replaceAll("@[0-9a-f]+", "@HASH"));
        }
        try {
            first.setRoot(null);
        } catch (NullPointerException e) {
            System.out.println("setRoot(null): " + e.getMessage());
        }
        VBox outer = new VBox();
        VBox child = new VBox();
        outer.getChildren().add(child);
        try {
            first.setRoot(child);
        } catch (IllegalArgumentException e) {
            System.out.println("a root inside a pane: " + e.getMessage().replaceAll("@[0-9a-f]+", "@HASH"));
        }
        first.setRoot(new VBox());
        System.out.println("old root free again: " + (new Scene(taken).getRoot() == taken));

        VBox root = new VBox(field, given, password, area, label, button, v, h, flow, grid, stack, border, withId, idButton, idBox);
        Scene scene = new Scene(root);
        System.out.println("scene before show: " + scene.getWidth() + " x " + scene.getHeight() + ", root " + (scene.getRoot() == root) + ", root toString " + root);
        Scene sized = new Scene(new VBox(), 320, 240);
        System.out.println("sized scene: " + sized.getWidth() + " x " + sized.getHeight());
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
