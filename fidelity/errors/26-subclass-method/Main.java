import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Animal animal = new Dog("Rex");
        animal.bark();
        animal.bark(3);
        ArrayList<Animal> animals = new ArrayList<>();
        animals.add(animal);
        animals.get(0).bark();
        animal.eatt();
    }
}

class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public void eat() {
        System.out.println(this.name + " eats");
    }
}

class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }

    public void bark() {
        System.out.println(this.name + " barks");
    }

    public void bark(int times) {
        for (int i = 0; i < times; i++) {
            bark();
        }
    }
}

class Cat extends Animal {
    public Cat(String name) {
        super(name);
    }
}
