public class Main {
    public static void main(String[] args) {
        System.out.println(new Student("Ada", 5));
    }
}

class Person {
    protected String name;

    public Person(String name) {
        this.name = name;
    }
}

class Student extends Person {
    private int credits;

    public Student(String name, int credits) {
        this.credits = credits;
        super(name);
    }

    public Student(String name) {
        System.out.println("A new student");
        this(name, 0);
    }
}
