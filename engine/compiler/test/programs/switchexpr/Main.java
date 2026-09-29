public class Main {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    static String kind(Day d) {
        return switch (d) {
            case SAT, SUN -> "weekend";
            case FRI -> {
                String s = "almost";
                yield s + " weekend";
            }
            default -> "workday";
        };
    }

    static int letters(String s) {
        switch (s) {
            case "one": return 3;
            case "three": return 5;
            case "Aa": case "BB": return -1;
            default: return s.length();
        }
    }

    static String describe(Object o) {
        return switch (o) {
            case null -> "null!";
            case Integer i when i > 10 -> "big int " + i;
            case Integer i -> "int " + i;
            case String s -> "string of " + s.length();
            case int[] arr -> "int array " + arr.length;
            default -> "other " + o.getClass().getSimpleName();
        };
    }

    public static void main(String[] args) {
        for (Day d : Day.values()) System.out.print(d + ":" + kind(d) + " ");
        System.out.println();
        System.out.println(letters("one") + " " + letters("three") + " " + letters("Aa") + " " + letters("BB") + " " + letters("seven"));
        System.out.println(describe(5) + ", " + describe(50) + ", " + describe("hey") + ", " + describe(new int[3]) + ", " + describe(null) + ", " + describe(2.5));
        int month = 2;
        int days = switch (month) { case 2 -> 28; case 4, 6, 9, 11 -> 30; default -> 31; };
        char grade = 'B';
        switch (grade) {
            case 'A' -> System.out.println("excellent");
            case 'B', 'C' -> System.out.println("good " + days);
            default -> System.out.println("?");
        }
        System.out.println(Day.valueOf("WED").ordinal() + " " + Day.MON.compareTo(Day.FRI));
    }
}
