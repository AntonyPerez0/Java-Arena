public class Main {
    public static void main(String[] args) {
        System.out.println(new Cat().kind());
    }
}

class Animal {
    public static String kind() {
        return "animal";
    }
}

class Cat extends Animal {
    @Override
    public String kind() {
        return "cat";
    }
}

interface Shape {
    static Shape unit() {
        return null;
    }
}

class Square implements Shape {
    @Override
    public Shape unit() {
        return this;
    }
}
