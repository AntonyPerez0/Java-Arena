import java.util.*;

public class Main {
    interface Animal {
        String sound();
        int legs();
    }

    static class Dog implements Animal {
        public String sound() { return "woof"; }
    }

    static class Name implements Comparable<Name> {
        String n;
    }

    public static void main(String[] args) {
        List<Name> names = new ArrayList<>();
        Collections.sort(names);
        Animal a = new Dog();
        String s = a.sound;
        int[] arr = {1, 2, 3};
        System.out.println(arr.length());
        String t = null;
        t.foo();
    }
}
