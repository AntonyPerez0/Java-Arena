public class Main {
    public static void main(String[] args) {
        Dog dog = new Dog("Rex");
        System.out.println(dog.getName());
    }
}

abstract class Animal {
    private String name;

    public Animal(String name) {
        this.name = name;
    }

    public String getName() {
        return this.name;
    }

    public abstract String makeSound(int times);
}

class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }

    public String makeSound() {
        return "woof";
    }
}

interface Readable {
    String read();
}

class Book implements Readable {
    private String text;
}

class Shape {
    public abstract double area();
}
