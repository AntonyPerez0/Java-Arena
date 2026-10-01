import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        Box<Integer> box = new Box<>(3);
        box.set("three");
        Box<Integer> other = new Box<>("three");
        Box<String> text = new Box<Integer>(4);
        String shown = box.get();
        List<Integer> numbers = new ArrayList<>();
        numbers.add("4");
        Box raw = new Box("plain");
        String fromRaw = raw.get();
        List list = new ArrayList();
        list.add("a");
        for (String item : list) {
            System.out.println(item);
        }
    }
}

class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }

    public T get() {
        return this.value;
    }

    public void set(T value) {
        this.value = value;
    }
}

interface Container<T> {
    void put(T value);
}

class Shelf implements Container {
    public void put(String value) {
    }
}
