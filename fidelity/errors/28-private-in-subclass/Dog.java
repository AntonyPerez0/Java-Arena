public class Dog extends Animal {
    public Dog(String name, int age) {
        super(name, age);
    }

    public void bark() {
        System.out.println(name + " barks");
    }

    public boolean isOlderThan(Dog other) {
        return this.age > other.age;
    }

    public void rest() {
        sleep();
    }
}
