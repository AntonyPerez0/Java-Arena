public class Main {
    public static void main(String[] args) {
        System.out.println(new Dog("Rex"));
    }
}

class Animal {
    public String makeSound() {
        return "...";
    }
}

class Dog extends Animal {
    private String name;

    public Dog(String name) {
        this.name = name;
    }

    @Override
    public String tostring() {
        return "Dog " + this.name;
    }

    @Override
    public String makesound() {
        return "woof";
    }

    @Override
    public boolean equals(Dog other) {
        return this.name.equals(other.name);
    }
}
