import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        OwnList<String> names = new OwnList<>();
    }
}

class OwnList<T> {
    private T[] values;
    private T[] spare;

    public OwnList() {
        this.values = new T[10];
        this.spare = new Object[10];
    }

    public T makeOne() {
        T value = new T();
        T other = new Object();
        return value;
    }
}

class OwnMap<K, V> {
    private ArrayList<Pair<K, V>>[] buckets;

    public OwnMap() {
        this.buckets = new ArrayList<Pair<K, V>>[16];
    }
}

class Pair<K, V> {
    private K key;
    private V value;
}
