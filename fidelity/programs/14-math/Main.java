public class Main {
    public static void main(String[] args) {
        System.out.println(Math.round(-2.5) + " " + Math.round(2.5) + " " + Math.round(2.4) + " " + Math.round(-2.6));
        System.out.println(Math.rint(2.5) + " " + Math.rint(3.5) + " " + Math.floor(-1.1) + " " + Math.ceil(-1.1));
        System.out.println(Math.abs(Integer.MIN_VALUE) + " " + Math.abs(-7) + " " + Math.abs(-7.5));
        System.out.println(Math.sqrt(2) + " " + Math.sqrt(16) + " " + Math.cbrt(27));
        System.out.println(Math.pow(2, 10) + " " + Math.pow(1.5, 2) + " " + Math.pow(2, 0.5));
        System.out.println(Math.max(3, 9) + " " + Math.min(-2.5, 1.0) + " " + Math.hypot(3, 4));
        System.out.println(Math.sin(Math.PI / 6) + " " + Math.cos(0) + " " + Math.tan(1));
        System.out.println(Math.log(10) + " " + Math.log10(1000) + " " + Math.exp(1));
        System.out.println(Math.toDegrees(Math.PI) + " " + Math.toRadians(180));
        System.out.println(Math.floorDiv(-7, 2) + " " + Math.floorMod(-7, 2) + " " + (-7 / 2) + " " + (-7 % 2));
        System.out.println(Math.PI + " " + Math.E);
        System.out.println(Math.signum(-3.2) + " " + Math.clamp(15, 0, 10));
    }
}
