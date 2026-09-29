import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Main {
    static class Student implements Comparable<Student> {
        private final String name;
        private final int points;
        private final int group;

        Student(String name, int points, int group) {
            this.name = name;
            this.points = points;
            this.group = group;
        }

        String getName() { return name; }
        int getPoints() { return points; }
        int getGroup() { return group; }

        @Override
        public int compareTo(Student other) {
            return this.name.compareTo(other.name);
        }

        @Override
        public String toString() {
            return name + " (" + points + " p, group " + group + ")";
        }
    }

    public static void main(String[] args) {
        List<Student> students = new ArrayList<>(List.of(
                new Student("Olivia", 42, 2), new Student("Eino", 37, 1), new Student("Aino", 42, 1),
                new Student("Leo", 29, 2), new Student("Helmi", 37, 2), new Student("Väinö", 50, 1)));
        students.sort(null);
        System.out.println(students);
        students.sort(Comparator.comparing(Student::getPoints).reversed().thenComparing(Student::getName));
        students.forEach(System.out::println);
        students.sort(Comparator.comparingInt(Student::getGroup).thenComparing(Student::getPoints, Comparator.reverseOrder()));
        System.out.println(students);
        students.sort((a, b) -> b.getName().length() - a.getName().length());
        System.out.println(students.get(0).getName() + " " + students.get(students.size() - 1).getName());
    }
}
