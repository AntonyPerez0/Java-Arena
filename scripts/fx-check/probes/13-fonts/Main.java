// Probe: fonts. Only JavaFX's own families (System, Serif, SansSerif, Monospaced), which every
// computer has: a family a computer may lack gives what that computer has.
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.stage.Stage;

public class Main extends Application {
    static void show(String what, Font f) {
        System.out.println(what + ": " + f + ", name " + f.getName() + ", family " + f.getFamily() + ", size " + f.getSize() + ", default " + f.equals(Font.getDefault()) + ", hash " + f.hashCode());
    }

    @Override
    public void start(Stage stage) {
        show("getDefault()", Font.getDefault());
        show("new Font(20)", new Font(20));
        show("new Font(-1)", new Font(-1));
        show("Font.font(0)", Font.font(0));
        show("Font.font(13)", Font.font(13));
        show("Font.font(12.5)", Font.font(12.5));
        String[] families = { "System", "Serif", "SansSerif", "Monospaced", "serif", "MONOSPACED", "Dialog", "DialogInput", "sans-serif", "monospace", "", null };
        for (String family : families) {
            show("Font.font(" + family + ", 20)", Font.font(family, 20));
        }
        show("Font.font(Serif, -5)", Font.font("Serif", -5));
        String[] names = { "System", "System Regular", "System Bold", "System Italic", "System Bold Italic", "system bold", "System Light", "Serif", "Serif Regular", "Serif Bold", "serif italic", "SansSerif Bold Italic", "Monospaced Regular", "Dialog Bold", "DialogInput Italic", "Serif Italic Bold", "", null };
        for (String name : names) {
            show("new Font(" + name + ", 18)", new Font(name, 18));
        }
        System.out.println("font(Serif, 20) equals new Font(Serif Regular, 20): " + Font.font("Serif", 20).equals(new Font("Serif Regular", 20)) + ", font(20) equals new Font(20): " + Font.font(20).equals(new Font(20)) + ", equals null " + Font.font(20).equals(null));

        Label big = new Label("Big");
        big.setFont(Font.font("Serif", 30));
        Label bold = new Label("Bold");
        bold.setFont(new Font("System Bold", 13));
        Label mono = new Label("Mono");
        mono.setFont(Font.font("monospaced", 14));
        Label same = new Label("Same as the default");
        same.setFont(Font.font(13));
        Label byName = new Label("By name");
        byName.setFont(new Font("Serif", 16));
        Button button = new Button("Button");
        button.setFont(Font.font("SansSerif", 15));
        TextField field = new TextField("Field");
        field.setFont(Font.font("Monospaced", 12));
        TextArea area = new TextArea("Area");
        area.setFont(new Font("Monospaced Bold", 11));
        // (No setFont(null): real JavaFX fails when it lays out a control without a font.)
        System.out.println("after setFont: " + big.getFont() + " | " + field.getFont() + " | " + area.getFont());
        Button grow = new Button("Grow");
        grow.setOnAction(e -> {
            big.setFont(Font.font(big.getFont().getFamily(), big.getFont().getSize() + 2));
            System.out.println("grown to " + big.getFont().getSize());
        });
        stage.setScene(new Scene(new VBox(big, bold, mono, same, byName, button, field, area, grow)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
