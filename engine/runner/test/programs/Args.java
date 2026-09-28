public class Args {
    public static void main(String[] args) {
        System.out.println(args.length + " arguments");
        for (int i = 0; i < args.length; i++) System.out.println(i + ": [" + args[i] + "]");
        if (args.length > 1) System.out.println(Integer.parseInt(args[0]) + Integer.parseInt(args[1]));
    }
}
