public class UncaughtCustom {
    static class ValidationException extends Exception {
        ValidationException(String message) {
            super(message);
        }
    }

    static void check(int age) throws ValidationException {
        if (age < 0) throw new ValidationException("age must be >= 0, was " + age);
    }

    public static void main(String[] args) throws Exception {
        check(5);
        System.out.println("5 ok");
        check(-1);
    }
}
