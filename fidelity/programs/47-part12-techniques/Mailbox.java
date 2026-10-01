// A container of text that gives back the newest message first.
public class Mailbox implements Container<String> {
    private String[] messages;
    private int count;

    public Mailbox(int capacity) {
        this.messages = new String[capacity];
    }

    @Override
    public void put(String value) {
        if (this.count < this.messages.length) {
            this.messages[this.count] = value.toUpperCase();
            this.count++;
        }
    }

    @Override
    public String take() {
        this.count--;
        String message = this.messages[this.count];
        this.messages[this.count] = null;
        return message;
    }

    @Override
    public boolean isEmpty() {
        return this.count == 0;
    }
}
