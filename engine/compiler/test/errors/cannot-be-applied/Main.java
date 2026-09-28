public class Main {
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        System.out.println(add(1));
        System.out.println(add("1", 2));
        String s = "abc";
        System.out.println(s.substring("1"));
    }
}
