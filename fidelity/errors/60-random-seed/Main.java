import java.util.Random;

public class Main {
    public static void main(String[] args) {
        Random fromText = new Random("seed");
        Random fromDecimal = new Random(3.5);
        Random fromTwo = new Random(1, 2);
        System.out.println(fromText.nextInt(10));
    }
}
