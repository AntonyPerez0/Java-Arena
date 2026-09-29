import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> numbers = new ArrayList<>();
        numbers.add(3);
        System.out.println(numbers.length());
        System.out.println(numbers.get(0).length);
        printAll(numbers);
    }
}
