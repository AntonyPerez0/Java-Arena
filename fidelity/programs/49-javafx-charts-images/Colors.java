import javafx.scene.paint.Color;

/** Colors and their formulas, printed. */
public class Colors {
    public static void show() {
        Color blue = Color.web("#3366cc");
        System.out.println("web " + blue + " " + blue.getRed() + " " + blue.getGreen() + " " + blue.getBlue() + " " + blue.getOpacity());
        System.out.println("brighter " + blue.brighter() + " darker " + blue.darker() + " grayscale " + blue.grayscale() + " invert " + blue.invert());
        System.out.println("named " + Color.CORNFLOWERBLUE + " " + Color.TRANSPARENT + " " + Color.web("darkgreen") + " " + Color.web("0x80ff0080") + " " + Color.web("#abc") + " " + Color.web("rgba(10, 20, 30, 0.5)") + " " + Color.web("hsl(120, 100%, 50%)"));
        Color half = Color.rgb(10, 20, 30, 0.5);
        System.out.println("rgb " + half + " " + half.hashCode() + " " + half.equals(Color.color(10 / 255.0, 20 / 255.0, 30 / 255.0, 0.5)) + " " + Color.BLACK.brighter() + " " + Color.WHITE.darker().darker());
        for (String bad : new String[] { "nope", "#12345", "rgb(1.5, 0, 0)" }) {
            try {
                Color.web(bad);
            } catch (IllegalArgumentException e) {
                System.out.println("web(\"" + bad + "\"): " + e.getMessage());
            }
        }
        try {
            Color.rgb(256, 0, 0);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
        try {
            Color.color(0.5, 1.5, 0);
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}
