import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Animal animal = new Dog("Rex");
        Dog dog = animal;
        ArrayList<Animal> animals = new ArrayList<>();
        animals.add(new Cat("Misu"));
        Dog first = animals.get(0);
        Dog puppy = new Animal("Nappi");
        Cat cat = new Dog("Musti");
        Dog fine = (Dog) animal;
        System.out.println(dog + " " + first + " " + puppy + " " + cat + " " + fine);
    }
}

class Animal {
    private String name;

    public Animal(String name) {
        this.name = name;
    }
}

class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }
}

class Cat extends Animal {
    public Cat(String name) {
        super(name);
    }
}
