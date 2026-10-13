package pairs;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.stage.Stage;

/**
 * The game's window: a button for each card, a status line and a "New game" button. It shows what
 * the PairsGame says and passes the clicks on to it; the rules themselves are all in PairsGame.
 */
public class PairsApp extends Application {

    /** How many cards go in a row of the board. */
    private static final int COLUMNS = 4;

    /** What a face down card shows. */
    private static final String FACE_DOWN = "?";

    private PairsGame game;
    private final List<Button> cardButtons = new ArrayList<>();
    private final Label status = new Label();

    @Override
    public void start(Stage stage) {
        game = newGame();

        GridPane board = new GridPane();
        board.setHgap(8);
        board.setVgap(8);
        board.setAlignment(Pos.CENTER);
        for (int i = 0; i < game.size(); i++) {
            int position = i;
            Button button = new Button(FACE_DOWN);
            button.setPrefSize(110, 70);
            button.setOnAction(event -> {
                // TODO: Step 7. Flip the card at this position, then show the game again with refresh().
            });
            cardButtons.add(button);
            board.add(button, i % COLUMNS, i / COLUMNS);
        }

        Button newGameButton = new Button("New game");
        newGameButton.setOnAction(event -> {
            game = newGame();
            refresh();
        });

        HBox bottom = new HBox(16, status, newGameButton);
        bottom.setAlignment(Pos.CENTER);
        bottom.setPadding(new Insets(12, 0, 0, 0));

        BorderPane layout = new BorderPane();
        layout.setCenter(board);
        layout.setBottom(bottom);
        layout.setPadding(new Insets(16));

        refresh();
        stage.setTitle("Tide pool pairs");
        stage.setScene(new Scene(layout));
        stage.show();
    }

    /** A new game with the tide pool's symbols, shuffled differently each time. */
    private static PairsGame newGame() {
        return new PairsGame(Deck.pairs(Deck.TIDE_POOL, new Random()));
    }

    /** Makes the buttons and the status line show the game as it is now. */
    private void refresh() {
        // TODO: Step 7. For each card button: show the card's symbol when the card is face up and
        //  FACE_DOWN when it isn't, and disable the button when the card is matched (setDisable).
        //  Then set the status label's text to StatusLine.of(game).
    }

    public static void main(String[] args) {
        launch(args);
    }
}
