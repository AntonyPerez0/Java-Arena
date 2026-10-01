// A list of its own, as the course builds one: an array that grows, with values shifted on removal.
// No @SuppressWarnings here: javac prints its note about unchecked operations, and the program still runs.
public class OwnList<T> {
    private T[] values;
    private int firstFreeIndex;

    public OwnList() {
        this.values = (T[]) new Object[2];
        this.firstFreeIndex = 0;
    }

    public void add(T value) {
        if (this.firstFreeIndex == this.values.length) {
            grow();
        }
        this.values[this.firstFreeIndex] = value;
        this.firstFreeIndex++;
    }

    private void grow() {
        int newSize = this.values.length + this.values.length / 2;
        T[] newValues = (T[]) new Object[newSize];
        for (int i = 0; i < this.values.length; i++) {
            newValues[i] = this.values[i];
        }
        this.values = newValues;
    }

    public boolean contains(T value) {
        return indexOf(value) >= 0;
    }

    public int indexOf(T value) {
        for (int i = 0; i < this.firstFreeIndex; i++) {
            if (this.values[i].equals(value)) {
                return i;
            }
        }
        return -1;
    }

    public void remove(T value) {
        int index = indexOf(value);
        if (index < 0) {
            return;
        }
        moveToTheLeft(index);
        this.firstFreeIndex--;
    }

    private void moveToTheLeft(int fromIndex) {
        for (int i = fromIndex; i < this.firstFreeIndex - 1; i++) {
            this.values[i] = this.values[i + 1];
        }
        this.values[this.firstFreeIndex - 1] = null;
    }

    public T value(int index) {
        if (index < 0 || index >= this.firstFreeIndex) {
            throw new ArrayIndexOutOfBoundsException("Index " + index + " outside of [0, " + this.firstFreeIndex + "]");
        }
        return this.values[index];
    }

    public int size() {
        return this.firstFreeIndex;
    }

    public int capacity() {
        return this.values.length;
    }

    // Gives out the array itself: an Object[], whatever T is.
    public T[] rawValues() {
        return this.values;
    }

    @Override
    public String toString() {
        StringBuilder text = new StringBuilder("[");
        for (int i = 0; i < this.firstFreeIndex; i++) {
            if (i > 0) {
                text.append(", ");
            }
            text.append(this.values[i]);
        }
        return text.append("]").toString();
    }
}
