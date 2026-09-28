import java.util.List;

public class Main {
    static class InventoryException extends RuntimeException {
        InventoryException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static int parseStock(String value) {
        return Integer.parseInt(value);
    }

    static int total(List<String> values) {
        int sum = 0;
        for (String v : values) {
            try {
                sum += parseStock(v);
            } catch (NumberFormatException e) {
                throw new InventoryException("Bad stock value: " + v, e);
            }
        }
        return sum;
    }

    public static void main(String[] args) {
        System.out.println(total(List.of("3", "4")));
        System.out.println(total(List.of("5", "seven")));
    }
}
