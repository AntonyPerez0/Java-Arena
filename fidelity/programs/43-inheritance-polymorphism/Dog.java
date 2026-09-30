public class Dog extends Animal {
    public Dog(String name) {
        super(name, 4);
    }

    public Dog() {
        this("Dog");
    }

    @Override
    public String sound() {
        return "woof";
    }

    @Override
    public String eat() {
        return super.eat() + " and wags its tail";
    }

    public String fetch() {
        return getName() + " fetches the ball";
    }
}
