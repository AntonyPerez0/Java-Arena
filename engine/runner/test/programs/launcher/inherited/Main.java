class Base {
    static {
        System.out.println("Base initialized");
    }

    public static void main(String[] args) {
        System.out.println("inherited main ran with " + args.length + " arguments");
    }
}

public class Main extends Base {
    static {
        System.out.println("Main initialized");
    }
}
