public class Main {
    public static void main(String[] args) {
        Student student = new Student("Ada", "Street 1");
        System.out.println(student);
    }
}

class Person {
    private String name;
    private String address;

    public Person(String name, String address) {
        this.name = name;
        this.address = address;
    }
}

class Student extends Person {
    private int credits;

    public Student(String name, String address) {
        this.credits = 0;
    }
}

class Teacher extends Person {
}

class Assistant extends Person {
    public Assistant(String name) {
        super(name);
    }
}
