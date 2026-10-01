public class Box<T> {
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

    public boolean isEmpty() {
        return this.value == null;
    }

    @Override
    public String toString() {
        return "Box(" + this.value + ")";
    }
}
