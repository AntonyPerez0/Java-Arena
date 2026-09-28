public class Main {
    static int pääluku(int ä) { return ä * 2; }

    public static void main(String[] args) {
        int määrä = 3;
        String sää = "aurinkoista";
        double π = 3.14159;
        int 数 = 7;
        char c = 'A';
        System.out.println(määrä + " " + sää + " " + π + " " + 数 + " " + c + " " + pääluku(määrä));
        String xy = "unicode escape identifier";
        System.out.println(xy);
        System.out.println("ÅÄÖ åäö € ß ñ 漢字 😀".length() + " " + "😀".codePointCount(0, 2));
    }
}
