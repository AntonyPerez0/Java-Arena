public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java Arena!");
        System.out.print("No newline, ");
        System.out.println("then a newline.");
        System.out.println(args.length + " arguments: " + String.join(" | ", args));
    }
}
