import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Animal animal = new Animal("Rex");
        NoiseCapable noisy = new NoiseCapable();
        List<String> names = new List<>();
        Map<String, Integer> ages = new Map<>();
        System.out.println(animal + " " + noisy + " " + names + " " + ages);
    }
}

interface NoiseCapable {
    void makeNoise();
}

abstract class Animal implements NoiseCapable {
    private String name;

    public Animal(String name) {
        this.name = name;
    }
}

class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }

    public void makeNoise() {
        System.out.println("woof");
    }
}
