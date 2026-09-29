public class UncaughtCause {
    static class AppException extends RuntimeException {
        AppException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static void load(String value) {
        try {
            parse(value);
        } catch (NumberFormatException e) {
            throw new AppException("could not load " + value, e);
        }
    }

    static int parse(String value) {
        return Integer.parseInt(value);
    }

    public static void main(String[] args) {
        load("x1");
    }
}
