public abstract class Animal implements NoiseCapable, Comparable<Animal> {
    private final String name;
    protected int legs;

    public Animal(String name, int legs) {
        this.name = name;
        this.legs = legs;
    }

    public String getName() {
        return this.name;
    }

    public abstract String sound();

    public String makeNoise() {
        return this.name + " says " + sound();
    }

    public String eat() {
        return this.name + " eats";
    }

    @Override
    public int compareTo(Animal other) {
        return this.name.compareTo(other.name);
    }

    @Override
    public boolean equals(Object compared) {
        if (this == compared) {
            return true;
        }
        if (!(compared instanceof Animal)) {
            return false;
        }
        Animal other = (Animal) compared;
        return this.getClass() == other.getClass() && this.name.equals(other.name);
    }

    @Override
    public int hashCode() {
        return this.name.hashCode() * 31 + this.legs;
    }

    @Override
    public String toString() {
        return getClass().getSimpleName() + " " + this.name;
    }
}
