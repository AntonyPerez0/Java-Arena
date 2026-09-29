import java.util.*;

public class Main {
    public static void main(String[] args) {
        int zero = 1 / 0;
        List raw = new ArrayList();
        raw.add("x");
        Integer old = new Integer(3);
        System.out.println(zero + raw.toString() + old);
    }
}
