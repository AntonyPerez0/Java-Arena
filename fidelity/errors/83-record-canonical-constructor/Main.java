public class Main {
    record Temperature(double celsius, String place) {
        Temperature(double celsius, String place) {
            if (celsius < -273.15) {
                throw new IllegalArgumentException("too cold");
            }
            this.celsius = celsius;
        }
    }

    public static void main(String[] args) {
        System.out.println(new Temperature(21.5, "Turku"));
    }
}
