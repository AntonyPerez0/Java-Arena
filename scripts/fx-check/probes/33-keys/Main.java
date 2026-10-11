import java.util.HashMap;
import java.util.Map;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.event.EventType;
import javafx.scene.Scene;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;
import javafx.scene.text.Text;
import javafx.stage.Stage;

/**
 * KeyCode (every constant with its name, code, character and every is...Key, getKeyCode, valueOf),
 * KeyEvent's constructor, getters, event types and toString, the key handlers' getters on a node
 * and a scene, requestFocus on a node without key handlers, and key events from the event lines:
 * every kind of key in JavaFX's order, the key state kept in a map as the MOOC keeps it, held keys
 * and keys that aren't held, a key name that doesn't exist, and no KEY_RELEASED for a key X
 * whose press ended the session (Platform.exit(), now or queued, or the only window closed), while
 * closing the key's window with another still showing keeps it.
 */
public class Main extends Application {
    static void p(String s) {
        System.out.println(s);
    }

    static String show(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c < 32 || c > 126) {
                b.append(String.format("\\u%04x", (int) c));
            } else {
                b.append(c);
            }
        }
        return b.append('"').toString();
    }

    final Map<KeyCode, Boolean> pressed = new HashMap<>();

    /**
     * A KeyEvent's toString without its source and target: an event made with the constructor has
     * JavaFX's own placeholder object there, whose name is a lambda's (different in every run).
     */
    static String text(KeyEvent e) {
        return e.toString().replaceFirst("source = .*?, target = .*?, ", "");
    }

    @Override
    public void start(Stage stage) {
        p(KeyCode.values().length + " key codes");
        for (KeyCode k : KeyCode.values()) {
            p(k.ordinal() + " " + k + " " + show(k.getName()) + " " + k.getCode() + " " + show(k.getChar()) + " f" + b(k.isFunctionKey()) + " n" + b(k.isNavigationKey()) + " a" + b(k.isArrowKey()) + " m" + b(k.isModifierKey()) + " l" + b(k.isLetterKey()) + " d" + b(k.isDigitKey()) + " k" + b(k.isKeypadKey()) + " w" + b(k.isWhitespaceKey()) + " M" + b(k.isMediaKey()) + " " + (KeyCode.getKeyCode(k.getName()) == k));
        }
        for (String name : new String[] { "Left", "LEFT", "left", "A", "a", "Space", "Enter", "Numpad 5", "Unknown", "Undefined", "", "Nope" }) {
            p("getKeyCode " + show(name) + " " + KeyCode.getKeyCode(name));
        }
        p("valueOf " + KeyCode.valueOf("LEFT") + " " + KeyCode.valueOf("DIGIT1"));
        try {
            KeyCode.valueOf("Left");
        } catch (IllegalArgumentException e) {
            p("valueOf Left: " + e.getMessage());
        }
        p("CHAR_UNDEFINED " + show(KeyEvent.CHAR_UNDEFINED));
        for (EventType<KeyEvent> t : java.util.Arrays.asList(KeyEvent.ANY, KeyEvent.KEY_PRESSED, KeyEvent.KEY_RELEASED, KeyEvent.KEY_TYPED)) {
            p("type " + t + " " + t.getName());
        }
        KeyEvent e1 = new KeyEvent(KeyEvent.KEY_PRESSED, "a", "a", KeyCode.A, true, false, true, false);
        p("pressed " + e1.getEventType() + " " + show(e1.getCharacter()) + " " + show(e1.getText()) + " " + e1.getCode() + " " + e1.isShiftDown() + e1.isControlDown() + e1.isAltDown() + e1.isMetaDown() + e1.isShortcutDown());
        p("toString " + text(e1));
        KeyEvent e2 = new KeyEvent(KeyEvent.KEY_TYPED, "x", "", KeyCode.UNDEFINED, false, true, false, true);
        p("typed " + text(e2) + " " + e2.isShortcutDown());
        KeyEvent e3 = new KeyEvent(KeyEvent.KEY_RELEASED, null, null, null, false, false, false, false);
        p("nulls " + show(e3.getCharacter()) + " " + show(e3.getText()) + " " + e3.getCode() + " " + text(e3));
        KeyEvent e4 = new KeyEvent(KeyEvent.KEY_TYPED, "", "", KeyCode.ENTER, false, false, false, false);
        p("typed with a code " + e4.getCode() + " " + show(e4.getCharacter()) + " " + text(e4));

        Pane pane = new Pane();
        pane.setPrefSize(200, 100);
        Rectangle player = new Rectangle(90, 40, 20, 20);
        player.setFill(Color.PURPLE);
        Text status = new Text(10, 90, "no keys");
        pane.getChildren().addAll(player, status);
        Rectangle stored = new Rectangle(5, 5);
        p("node handlers " + (stored.getOnKeyPressed() == null) + (stored.getOnKeyReleased() == null) + (stored.getOnKeyTyped() == null));
        stored.setOnKeyPressed(e -> p("never"));
        stored.setOnKeyReleased(e -> p("never"));
        stored.setOnKeyTyped(e -> p("never"));
        p("node handlers set " + (stored.getOnKeyPressed() != null) + (stored.getOnKeyReleased() != null) + (stored.getOnKeyTyped() != null));
        stored.setOnKeyTyped(null);
        p("node typed handler removed " + (stored.getOnKeyTyped() == null));

        Scene scene = new Scene(pane);
        p("scene handlers " + (scene.getOnKeyPressed() == null) + (scene.getOnKeyReleased() == null) + (scene.getOnKeyTyped() == null));
        scene.setOnKeyPressed(e -> {
            p("pressed " + e.getCode() + " " + show(e.getText()) + " " + show(e.getCharacter()) + " " + e.getEventType() + " " + e.isShiftDown());
            pressed.put(e.getCode(), Boolean.TRUE);
            if (e.getCode() == KeyCode.RIGHT) {
                player.setTranslateX(player.getTranslateX() + 10);
            }
            if (e.getCode() == KeyCode.UP) {
                player.setRotate(player.getRotate() - 30);
            }
            status.setText("held " + held());
            endOrOpen(e.getCode(), stage);
        });
        scene.setOnKeyReleased(e -> {
            p("released " + e.getCode() + " " + show(e.getText()) + " " + show(e.getCharacter()));
            pressed.put(e.getCode(), Boolean.FALSE);
            status.setText("held " + held());
        });
        scene.setOnKeyTyped(e -> p("typed " + show(e.getCharacter()) + " " + e.getCode() + " " + show(e.getText())));
        p("scene handlers set " + (scene.getOnKeyPressed() != null) + (scene.getOnKeyReleased() != null) + (scene.getOnKeyTyped() != null));
        stage.setScene(scene);
        stage.show();
        player.requestFocus();
    }

    /**
     * Keys that end the session or open a window, for the runs that check no KEY_RELEASED comes
     * after the session ended: Q calls Platform.exit(), W queues it with runLater, E closes the only
     * window, O opens a second window whose own C closes it (the first still shows, so the release
     * of C still goes to the closed window's scene).
     */
    void endOrOpen(KeyCode code, Stage stage) {
        if (code == KeyCode.Q) {
            p("exit");
            Platform.exit();
        } else if (code == KeyCode.W) {
            Platform.runLater(() -> {
                p("exit later");
                Platform.exit();
            });
        } else if (code == KeyCode.E) {
            p("close");
            stage.close();
        } else if (code == KeyCode.O) {
            Stage second = new Stage();
            second.setTitle("Second");
            Pane pane = new Pane(new Text(10, 20, "second"));
            pane.setPrefSize(100, 50);
            Scene scene = new Scene(pane);
            scene.setOnKeyPressed(e -> {
                p("second pressed " + e.getCode());
                if (e.getCode() == KeyCode.C) {
                    p("close second");
                    second.close();
                }
            });
            scene.setOnKeyReleased(e -> p("second released " + e.getCode()));
            second.setScene(scene);
            second.show();
        }
    }

    /** The keys held now, in KeyCode order. */
    String held() {
        StringBuilder b = new StringBuilder();
        for (KeyCode k : KeyCode.values()) {
            if (pressed.getOrDefault(k, false)) {
                b.append(k).append(' ');
            }
        }
        return b.toString().trim();
    }

    static String b(boolean v) {
        return v ? "1" : "0";
    }

    public static void main(String[] args) {
        launch(args);
    }
}
