import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Main {
    public static void main(String[] args) {
        List<NoiseCapable> noisy = new ArrayList<>();
        noisy.add(new Dog("Rex"));
        noisy.add(new Cat("Misu"));
        noisy.add(new Puppy("Nappi", 9));
        noisy.add(new Radio(94.5));
        noisy.add(new Dog());

        for (NoiseCapable n : noisy) {
            System.out.println(n.makeNoise());
            if (n instanceof Animal) {
                Animal animal = (Animal) n;
                System.out.println("  " + animal + ": " + animal.eat());
            } else {
                System.out.println("  not an animal");
            }
            if (n instanceof Dog dog) {
                System.out.println("  " + dog.fetch());
            }
        }

        // Casting to the wrong subclass fails at run time.
        Animal misu = (Animal) noisy.get(1);
        try {
            Dog wrong = (Dog) misu;
            System.out.println(wrong.fetch());
        } catch (ClassCastException e) {
            System.out.println("ClassCastException: " + e.getMessage());
        }
        Object text = "not a number";
        try {
            Integer number = (Integer) text;
            System.out.println(number);
        } catch (ClassCastException e) {
            System.out.println("ClassCastException: " + e.getMessage());
        }

        // Object's methods, reached through a subclass.
        Object o = new Puppy("Nappi", 9);
        System.out.println(o.toString());
        System.out.println(o.equals(noisy.get(2)));
        System.out.println(o.equals(new Puppy("Rex", 9)));
        System.out.println(o.equals(new Dog("Nappi")));
        System.out.println(o.hashCode() == noisy.get(2).hashCode());
        System.out.println(o.getClass().getName() + " extends " + o.getClass().getSuperclass().getName());
        System.out.println(o instanceof Animal);
        System.out.println(o instanceof Cat);
        System.out.println(o instanceof NoiseCapable);

        // Interfaces as the types of variables.
        List<Animal> animals = new ArrayList<>();
        for (NoiseCapable n : noisy) {
            if (n instanceof Animal) {
                animals.add((Animal) n);
            }
        }
        Collections.sort(animals);
        System.out.println(animals);
        Collection<Animal> collection = animals;
        System.out.println(collection.size() + " " + collection.contains(new Cat("Misu")) + " " + collection.contains(new Dog("Misu")));
        collection.remove(new Dog("Dog"));
        System.out.println(collection);

        Map<String, List<String>> bySound = new HashMap<>();
        for (Animal a : animals) {
            bySound.putIfAbsent(a.sound(), new ArrayList<>());
            bySound.get(a.sound()).add(a.getName());
        }
        List<String> sounds = new ArrayList<>(bySound.keySet());
        Collections.sort(sounds);
        for (String sound : sounds) {
            System.out.println(sound + ": " + bySound.get(sound));
        }

        Set<Animal> unique = new HashSet<>();
        unique.add(new Dog("Rex"));
        unique.add(new Dog("Rex"));
        unique.add(new Cat("Rex"));
        unique.add(new Puppy("Rex", 9));
        System.out.println(unique.size());
        List<String> names = new ArrayList<>();
        for (Animal a : unique) {
            names.add(a.toString());
        }
        Collections.sort(names);
        System.out.println(names);

        Set<String> words = new HashSet<>(List.of("woof", "meow", "yip", "tweet"));
        List<String> sorted = new ArrayList<>(words);
        Collections.sort(sorted);
        System.out.println(sorted);

        int legs = 0;
        for (Animal a : animals) {
            legs += a.legs;
        }
        System.out.println("legs: " + legs);
    }
}
