import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<int> numbers = new ArrayList<>();
        ArrayList<char> letters = new ArrayList<char>();
        HashMap<String, int> ages = new HashMap<>();
        Box<double> price = new Box<>(2.5);
        Pair<String, boolean> answer = new Pair<>("done", true);
    }
}

class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }
}

class Pair<K, V> {
    private K key;
    private V value;

    public Pair(K key, V value) {
        this.key = key;
        this.value = value;
    }
}
