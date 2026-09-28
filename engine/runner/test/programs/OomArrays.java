public class OomArrays {
    static void attempt(String label, Runnable allocation) {
        try {
            allocation.run();
            System.out.println(label + ": allocated");
        } catch (OutOfMemoryError e) {
            System.out.println(label + ": " + e);
        }
    }

    public static void main(String[] args) {
        attempt("new long[1_000_000_000]", () -> { long[] a = new long[1_000_000_000]; });
        attempt("new int[Integer.MAX_VALUE]", () -> { int[] a = new int[Integer.MAX_VALUE]; });
        attempt("new byte[Integer.MAX_VALUE - 1]", () -> { byte[] a = new byte[Integer.MAX_VALUE - 1]; });
        attempt("new Object[Integer.MAX_VALUE - 2]", () -> { Object[] a = new Object[Integer.MAX_VALUE - 2]; });
        attempt("new String[Integer.MAX_VALUE]", () -> { String[] a = new String[Integer.MAX_VALUE]; });
        attempt("new int[3][Integer.MAX_VALUE]", () -> { int[][] a = new int[3][Integer.MAX_VALUE]; });
        attempt("new int[Integer.MAX_VALUE][0]", () -> { int[][] a = new int[Integer.MAX_VALUE][0]; });
        attempt("new int[0][Integer.MAX_VALUE]", () -> { int[][] a = new int[0][Integer.MAX_VALUE]; });
        attempt("new double[100_000][100_000]", () -> { double[][] a = new double[100_000][100_000]; });
        attempt("new int[1000][1000]", () -> { int[][] a = new int[1000][1000]; });
    }
}
