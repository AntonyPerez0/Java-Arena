import java.io.FileWriter;
import java.io.IOException;

public class Main {
    public static void main(String[] args) {
        Saver saver = new FileSaver();
        saver.save("Hello");
        Animal animal = new Dog();
        animal.speak();
    }
}

interface Saver {
    void save(String text);
}

class FileSaver implements Saver {
    @Override
    public void save(String text) throws IOException {
        try (FileWriter writer = new FileWriter("saved.txt")) {
            writer.write(text);
        }
    }
}

class Animal {
    public void speak() {
        System.out.println("...");
    }
}

class Dog extends Animal {
    @Override
    public void speak() throws Exception {
        System.out.println("Woof");
    }
}
