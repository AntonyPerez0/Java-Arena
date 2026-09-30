public class Main {
    public static void main(String[] args) {
        System.out.println(new Dog().read());
    }
}

class Animal {
    public String name() {
        return "animal";
    }
}

interface Readable {
    String read();
}

class Dog implements Animal {
}

class Book extends Readable {
    public String read() {
        return "text";
    }
}

interface Pet extends Animal {
}
