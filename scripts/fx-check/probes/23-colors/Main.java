import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Random;
import java.util.concurrent.Callable;
import javafx.application.Application;
import javafx.scene.paint.Color;
import javafx.scene.paint.Paint;
import javafx.stage.Stage;

// Probe: Paint and Color. Every named constant, the constructor and the factory methods with their
// checks and messages, every form web() reads (and the ones it refuses), the formulas of brighter,
// darker, grayscale and invert (also on thousands of random colors, as a hash of the exact
// doubles), equals, hashCode and toString.
public class Main extends Application {
    static void p(Object o) {
        System.out.println(o);
    }

    static void t(String what, Callable<Object> c) {
        try {
            p(what + " = " + c.call());
        } catch (Throwable e) {
            p(what + " ! " + e);
        }
    }

    static String all(Color c) {
        return c + " " + c.getRed() + " " + c.getGreen() + " " + c.getBlue() + " " + c.getOpacity();
    }

    @Override
    public void start(Stage stage) throws Exception {
        p("Paint is abstract: " + Modifier.isAbstract(Paint.class.getModifiers()) + ", Color extends " + Color.class.getSuperclass().getName());
        int named = 0;
        for (Field f : Color.class.getFields()) {
            if (Modifier.isStatic(f.getModifiers()) && f.getType() == Color.class) {
                named++;
                p(f.getName() + " " + all((Color) f.get(null)));
            }
        }
        p(named + " named colors");

        t("new Color(0.1, 0.2, 0.3, 0.4)", () -> all(new Color(0.1, 0.2, 0.3, 0.4)));
        t("rgb(200, 100, 50)", () -> all(Color.rgb(200, 100, 50)));
        t("rgb(200, 100, 50, 0.5)", () -> all(Color.rgb(200, 100, 50, 0.5)));
        t("color(0.25, 0.5, 0.75)", () -> all(Color.color(0.25, 0.5, 0.75)));
        t("color(0.25, 0.5, 0.75, 0.125)", () -> all(Color.color(0.25, 0.5, 0.75, 0.125)));
        t("rgb(256, 0, 0)", () -> Color.rgb(256, 0, 0));
        t("rgb(-1, 0, 0)", () -> Color.rgb(-1, 0, 0));
        t("rgb(0, 300, 0)", () -> Color.rgb(0, 300, 0));
        t("rgb(0, 0, 999)", () -> Color.rgb(0, 0, 999));
        t("rgb(0, 0, 0, 1.5)", () -> Color.rgb(0, 0, 0, 1.5));
        t("rgb(0, 0, 0, -0.1)", () -> Color.rgb(0, 0, 0, -0.1));
        t("rgb(256, 300, 0, 2)", () -> Color.rgb(256, 300, 0, 2));
        t("rgb(0, 0, 0, NaN)", () -> Color.rgb(0, 0, 0, Double.NaN));
        t("color(1.1, 0, 0)", () -> Color.color(1.1, 0, 0));
        t("color(0, -0.1, 0)", () -> Color.color(0, -0.1, 0));
        t("color(0, 0, 2)", () -> Color.color(0, 0, 2));
        t("color(0, 0, 0, 2)", () -> Color.color(0, 0, 0, 2));
        t("color(2, -1, 0, 2)", () -> Color.color(2, -1, 0, 2));
        t("new Color(2, 0, 0, 1)", () -> new Color(2, 0, 0, 1));
        t("new Color(0, 0, 0, NaN)", () -> new Color(0, 0, 0, Double.NaN));
        t("color(NaN, 0, 0)", () -> Color.color(Double.NaN, 0, 0));

        String[] webs = { "#f00", "#ff0000", "#ff000080", "0xff0000", "0xff000080", "red", "RED", "Red", "#F0A", "f0a", "ff00aa", "ff00aa80", "0x123", "#1234", "f0a8", "#ff00aa8", "", "nope", " red", "red ", "transparent", "grey", "darkgrey", "lightgoldenrodyellow", "#gg0000", "0X112233", "#ff00aaff",
            "rgb(255,0,0)", "rgb( 255 , 0 , 0 )", "rgb(255,0,0)x", "rgb(255,0,0", "rgb(255,0)", "rgb(255,0,0,0)", "rgb(300,-5,0)", "rgb(1.5,0,0)", "rgb(50%,0%,100%)", "rgb(50%,0,0)", "rgb(150%,-10%,0%)", "rgba(255,0,0,0.5)", "rgba(255,0,0,50%)", "rgba(255,0,0,1.5)", "rgba(255,0,0)", "rgba(10%,20%,30%,0.25)", "RGB(1,2,3)", "rgb()",
            "hsl(120,100%,50%)", "hsl(240,100%,25%)", "hsl(30,50%,60%)", "hsl(-30,100%,50%)", "hsl(400,100%,50%)", "hsl(120,100,50)", "hsl(120,150%,50%)", "hsla(120,100%,50%,0.5)", "hsla(120,100%,50%)", "hsl(13.7,77.7%,33.3%)", "#-1aabb", "#1 2", "0x", "#", "abc", "abcdef", "ABCDEF12" };
        for (String w : webs) {
            t("web(\"" + w + "\")", () -> all(Color.web(w)));
        }
        t("web(null)", () -> Color.web(null));
        t("web(\"RED\") == RED", () -> Color.web("RED") == Color.RED);
        t("rgb(255, 0, 0) == RED", () -> Color.rgb(255, 0, 0) == Color.RED);

        Color c = Color.rgb(200, 100, 50, 0.5);
        p("formulas " + all(c.invert()) + " | " + all(c.grayscale()) + " | " + all(c.brighter()) + " | " + all(c.darker()));
        Color[] edges = { Color.RED, Color.BLACK, Color.WHITE, Color.GRAY, Color.TRANSPARENT, Color.color(0.001, 0.5, 0.5), Color.color(0, 0, 0.5), Color.rgb(1, 1, 1), Color.color(1, 1, 1, 0.5), new Color(0, 0, 0, 0) };
        for (Color e : edges) {
            p("edge " + e + ": " + all(e.brighter()) + " | " + all(e.darker()) + " | " + all(e.grayscale()) + " | " + all(e.invert()));
        }
        Color d = Color.color(0.1, 0.2, 0.3, 0.4);
        p("equals " + new Color(0.1, 0.2, 0.3, 0.4).equals(d) + " " + Color.RED.equals(Color.web("red")) + " " + Color.RED.equals(null) + " " + Color.RED.equals("red") + " " + Color.color(0.1, 0, 0).equals(Color.color(0.1000000001, 0, 0)));
        p("hashCode " + d.hashCode() + " " + Color.RED.hashCode() + " " + Color.TRANSPARENT.hashCode() + " " + new Color(0.1, 0.2, 0.3, 1).hashCode());
        p("toString " + Color.color(0.123, 0.5, 0.9981, 0.002) + " " + Color.color(0.5, 0.5, 0.5) + " " + Color.rgb(1, 2, 3, 0.999));

        Random r = new Random(17);
        long h = 0;
        for (int i = 0; i < 20000; i++) {
            Color x = i % 3 == 0 ? Color.rgb(r.nextInt(256), r.nextInt(256), r.nextInt(256), r.nextDouble()) : Color.color(r.nextDouble(), r.nextDouble(), r.nextDouble(), r.nextDouble());
            Color[] made = { x.brighter(), x.darker(), x.grayscale(), x.invert(), x.brighter().brighter(), x.darker().darker().brighter() };
            for (Color m : made) {
                h = h * 31 + Double.doubleToLongBits(m.getRed()) * 7 + Double.doubleToLongBits(m.getGreen()) * 11 + Double.doubleToLongBits(m.getBlue()) * 13 + Double.doubleToLongBits(m.getOpacity()) + m.hashCode() + m.toString().hashCode();
            }
            String hsl = "hsla(" + (r.nextDouble() * 800 - 200) + "," + (r.nextDouble() * 120 - 10) + "%," + (r.nextDouble() * 120 - 10) + "%," + r.nextDouble() + ")";
            Color w = Color.web(hsl);
            h = h * 31 + Double.doubleToLongBits(w.getRed()) * 7 + Double.doubleToLongBits(w.getGreen()) * 11 + Double.doubleToLongBits(w.getBlue()) * 13 + Double.doubleToLongBits(w.getOpacity());
        }
        p("random colors: " + Long.toHexString(h));
    }

    public static void main(String[] args) {
        launch(args);
    }
}
