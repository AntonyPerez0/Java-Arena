public class Main {
    public static void main(String[] args) {
        Readable message = new TextMessage("Ada", "hi");
        System.out.println(message.read());
    }
}

interface Readable {
    String read();
}

class TextMessage implements Readable {
    private String sender;
    private String content;

    public TextMessage(String sender, String content) {
        this.sender = sender;
        this.content = content;
    }

    String read() {
        return this.content;
    }

    String toString() {
        return this.sender + ": " + this.content;
    }
}
