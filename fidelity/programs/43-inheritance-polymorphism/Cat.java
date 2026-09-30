public class Cat extends Animal {
    public Cat(String name) {
        super(name, 4);
    }

    @Override
    public String sound() {
        return "meow";
    }
}
