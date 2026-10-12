public class Main {
    static String label(int day) {
        return switch (day) {
            case 1 -> "Monday";
            case 2, 3 -> "midweek";
            case 3 -> "Wednesday";
            default -> "other";
        };
    }

    static String grade(double points) {
        return switch (points) {
            case 4.0 -> "top";
            default -> "fine";
        };
    }

    static String sign(boolean on) {
        return switch (on) {
            case true -> "on";
            default -> "off";
        };
    }

    static int code(String letter) {
        return switch (letter) {
            case 'a' -> 1;
            case "b" -> 2;
            default -> 0;
        };
    }

    static String name(int day) {
        String result = switch (day) {
            case 1 -> {
                return "Monday";
            }
            case 2 -> {
                break;
            }
            default -> "other";
        };
        return result;
    }

    static String kind(Object value) {
        return switch (value) {
            case CharSequence text -> "text";
            case String s -> "string";
            case Integer n when n > 0 -> "positive";
            case Integer n -> "number";
            default -> "other";
        };
    }

    static void print(int n) {
        String text = switch (n) {
            case 1:
                System.out.println("one");
            default:
                System.out.println("many");
        };
    }

    public static void main(String[] args) {
        System.out.println(label(1) + grade(4.0) + sign(true) + code("a") + name(1) + kind(5));
        print(1);
    }
}
