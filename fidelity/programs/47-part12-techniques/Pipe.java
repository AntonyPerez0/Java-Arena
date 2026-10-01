// A container that gives its values back in the order they were put in, kept in a list of its own.
public class Pipe<T> implements Container<T> {
    private OwnList<T> values;

    public Pipe() {
        this.values = new OwnList<>();
    }

    @Override
    public void put(T value) {
        this.values.add(value);
    }

    @Override
    public T take() {
        T first = this.values.value(0);
        this.values.remove(first);
        return first;
    }

    @Override
    public boolean isEmpty() {
        return this.values.size() == 0;
    }
}
