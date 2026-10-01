public interface Container<T> {
    void put(T value);

    T take();

    boolean isEmpty();
}
