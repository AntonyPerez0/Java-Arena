import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.media.AudioClip;
import javafx.scene.media.*;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        AudioClip bell = new AudioClip("file:bell.wav");
        Button ring = new Button("Ring");
        ring.setOnAction(event -> bell.play());
        Media song = new Media("file:song.mp3");
        javafx.scene.media.MediaPlayer player = new javafx.scene.media.MediaPlayer(song);
        stage.setScene(new Scene(ring));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
