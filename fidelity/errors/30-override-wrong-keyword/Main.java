public class Main {
    public static void main(String[] args) {
        System.out.println(new Book().read());
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
    @Override
    public String name() {
        return "dog";
    }
}

class Book extends Readable {
    @Override
    public String read() {
        return "text";
    }
}
