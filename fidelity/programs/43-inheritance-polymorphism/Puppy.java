public class Puppy extends Dog {
    private int weeks;

    public Puppy(String name, int weeks) {
        super(name);
        this.weeks = weeks;
    }

    @Override
    public String sound() {
        return "yip (" + super.sound() + " one day)";
    }

    @Override
    public String toString() {
        return super.toString() + ", " + this.weeks + " weeks, " + this.legs + " legs";
    }
}
