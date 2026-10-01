public class Main {
    public static void main(String[] args) {
        int[][] grid = new int[3][4];
        int cell = grid[0];
        grid[1] = 5;
        int[] flat = new int[3][4];
        int[][] square = new int[3];
        int[][] table = {1, 2, 3};
        for (int value : grid) {
            System.out.println(value);
        }
        int deep = grid[1][2][0];
        int[] row = grid[0][1];
        printRow(grid);
        System.out.println(sum(grid[0]));
        String[][] names = new String[2][2];
        names[0] = "Ada";
        String name = names[1];
    }

    public static void printRow(int[] row) {
        System.out.println(row.length);
    }

    public static int sum(int[][] all) {
        return all.length;
    }
}
