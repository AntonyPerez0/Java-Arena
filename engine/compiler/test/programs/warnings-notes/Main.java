import java.util.*;

public class Main {
    @Deprecated
    static void old() { System.out.println("old"); }

    public static void main(String[] args) {
        List list = new ArrayList();
        list.add("unchecked");
        List<String> typed = list;
        System.out.println(typed.get(0));
        old();
        Integer boxed = new Integer(5);
        System.out.println(boxed + new Date(0L).getYear());
        int x = 1 / 0 > 0 ? 1 : 2;
    }
}
