// A hash map of its own, as the course builds one: buckets of key-value pairs in an array that grows.
public class OwnMap<K, V> {
    private OwnList<Pair<K, V>>[] values;
    private int firstFreeIndex;

    @SuppressWarnings("unchecked")
    public OwnMap() {
        this.values = new OwnList[8];
        this.firstFreeIndex = 0;
    }

    private int bucketOf(K key, int length) {
        return Math.abs(key.hashCode() % length);
    }

    public V get(K key) {
        OwnList<Pair<K, V>> bucket = this.values[bucketOf(key, this.values.length)];
        if (bucket == null) {
            return null;
        }
        for (int i = 0; i < bucket.size(); i++) {
            if (bucket.value(i).getKey().equals(key)) {
                return bucket.value(i).getValue();
            }
        }
        return null;
    }

    public void put(K key, V value) {
        OwnList<Pair<K, V>> bucket = bucketFor(key);
        int index = indexIn(bucket, key);
        if (index < 0) {
            bucket.add(new Pair<>(key, value));
            this.firstFreeIndex++;
        } else {
            bucket.value(index).setValue(value);
        }
        if (1.0 * this.firstFreeIndex / this.values.length > 0.75) {
            grow();
        }
    }

    public V remove(K key) {
        OwnList<Pair<K, V>> bucket = this.values[bucketOf(key, this.values.length)];
        int index = bucket == null ? -1 : indexIn(bucket, key);
        if (index < 0) {
            return null;
        }
        Pair<K, V> pair = bucket.value(index);
        bucket.remove(pair);
        this.firstFreeIndex--;
        return pair.getValue();
    }

    private OwnList<Pair<K, V>> bucketFor(K key) {
        int hash = bucketOf(key, this.values.length);
        if (this.values[hash] == null) {
            this.values[hash] = new OwnList<>();
        }
        return this.values[hash];
    }

    private int indexIn(OwnList<Pair<K, V>> bucket, K key) {
        for (int i = 0; i < bucket.size(); i++) {
            if (bucket.value(i).getKey().equals(key)) {
                return i;
            }
        }
        return -1;
    }

    @SuppressWarnings("unchecked")
    private void grow() {
        OwnList<Pair<K, V>>[] newValues = new OwnList[this.values.length * 2];
        for (OwnList<Pair<K, V>> bucket : this.values) {
            if (bucket == null) {
                continue;
            }
            for (int i = 0; i < bucket.size(); i++) {
                Pair<K, V> pair = bucket.value(i);
                int hash = bucketOf(pair.getKey(), newValues.length);
                if (newValues[hash] == null) {
                    newValues[hash] = new OwnList<>();
                }
                newValues[hash].add(pair);
            }
        }
        this.values = newValues;
    }

    public int size() {
        return this.firstFreeIndex;
    }

    public int buckets() {
        return this.values.length;
    }

    // The pairs in bucket order, then in the order each bucket holds them.
    @Override
    public String toString() {
        StringBuilder text = new StringBuilder("{");
        for (OwnList<Pair<K, V>> bucket : this.values) {
            if (bucket == null) {
                continue;
            }
            for (int i = 0; i < bucket.size(); i++) {
                if (text.length() > 1) {
                    text.append(", ");
                }
                text.append(bucket.value(i));
            }
        }
        return text.append("}").toString();
    }
}
