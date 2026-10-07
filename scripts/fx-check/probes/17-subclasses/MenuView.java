import javafx.scene.control.Button;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;

public class MenuView extends VBox {
    public MenuView() {
        super(2);
        SaveButton save = new SaveButton();
        save.setOnAction(e -> {
            CounterLabel counter = (CounterLabel) ((VBox) getParent()).getChildren().get(1);
            counter.up();
            System.out.println("saved, counter " + counter.getText());
        });
        getChildren().addAll(save, new HBox(new Button("Plain")));
    }
}
