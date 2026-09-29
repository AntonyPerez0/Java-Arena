public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            sb.append(i);
            if (i < 5) {
                sb.append(", ");
            }
        }
        System.out.println(sb);
        sb.insert(0, "[").append("]");
        System.out.println(sb.toString());
        System.out.println(sb.length() + " " + sb.charAt(1) + " " + sb.indexOf("3"));
        sb.reverse();
        System.out.println(sb);
        sb.setLength(0);
        sb.append("hello world");
        sb.setCharAt(0, 'H');
        sb.deleteCharAt(5);
        sb.replace(5, 10, "There");
        System.out.println(sb);
        sb.delete(0, 5);
        System.out.println(sb + "!" + 3.0 + 'c' + true + null);
        StringBuilder triangle = new StringBuilder();
        for (int row = 1; row <= 4; row++) {
            triangle.append(" ".repeat(4 - row)).append("*".repeat(2 * row - 1)).append("\n");
        }
        System.out.print(triangle);
    }
}
