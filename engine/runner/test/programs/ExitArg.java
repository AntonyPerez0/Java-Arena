public class ExitArg {
    public static void main(String[] args) {
        int code = Integer.parseInt(args[0]);
        System.out.println("System.exit(" + code + ")");
        System.exit(code);
    }
}
