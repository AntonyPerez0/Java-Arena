public class ExitCode {
    static void finish(int code) {
        System.out.println("finishing with " + code);
        System.exit(code);
    }

    public static void main(String[] args) {
        try {
            finish(3);
        } finally {
            System.out.println("finally must not run");
        }
    }
}
